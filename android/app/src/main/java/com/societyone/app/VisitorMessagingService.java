package com.societyone.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Extends Capacitor's own FCM service so every other push (notices, events)
 * keeps working exactly as before via the normal JS pushNotificationReceived
 * path — this only intercepts messages explicitly tagged
 * type=visitor_request to build a notification with native Approve/Deny
 * action buttons, since a guest is physically waiting at the gate and
 * opening the app first (even briefly) costs time that matters.
 *
 * Backend sends visitor-request pushes as data-only (see
 * societyone-backend's PushNotificationPayload.dataOnly) specifically so
 * Android invokes onMessageReceived even while backgrounded/killed, instead
 * of silently auto-displaying a plain, non-actionable system-tray
 * notification (see AndroidManifest.xml for how this class is registered in
 * place of the library's default).
 */
public class VisitorMessagingService extends MessagingService {

    // "_v2": intentionally a new channel id, not a rename of the original
    // "visitor_requests" one — Android locks a channel's sound/vibration to
    // whatever they were the FIRST time it was created on a given device,
    // and silently ignores any changes made here afterwards. A fresh id is
    // the only reliable way to actually change them on devices that already
    // received a visitor-request push before this change.
    private static final String CHANNEL_ID = "visitor_requests_v2";
    private static final String CHANNEL_NAME = "Visitor Requests";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if ("visitor_request".equals(data.get("type"))) {
            showVisitorNotification(data);
        }
        // Preserve default behavior (forwards to JS pushNotificationReceived
        // when the app/bridge is alive) for every other message type.
        super.onMessageReceived(remoteMessage);
    }

    private void showVisitorNotification(Map<String, String> data) {
        String requestId = data.get("requestId");
        String title = data.containsKey("title") ? data.get("title") : "Visitor at the Gate";
        String body = data.containsKey("body") ? data.get("body") : "A visitor is waiting for your approval.";

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;
        ensureChannel(notificationManager);

        int notificationId = requestId != null ? requestId.hashCode() : (int) System.currentTimeMillis();

        // Deliberately PendingIntent.getActivity() directly for all three —
        // not routed through a BroadcastReceiver. A notification action tap
        // carries a temporary exemption from Android's background-activity-
        // launch restrictions, but that exemption doesn't reliably survive
        // being handed off to a receiver that then calls startActivity()
        // itself (an "activity trampoline") — that was tried and is why the
        // app was only opening once launched manually instead of
        // immediately on tap. Going directly to the activity keeps the
        // exemption intact. The notification is cancelled from the activity
        // side instead (see MainActivity) once it opens as a result.
        PendingIntent tapIntent = buildActivityIntent(notificationId, requestId, null, 0);
        PendingIntent approveIntent = buildActivityIntent(notificationId, requestId, "Approved", 1);
        PendingIntent denyIntent = buildActivityIntent(notificationId, requestId, "Denied", 2);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            // TODO: swap for a dedicated white/transparent status-bar icon
            // once one exists — the full-color launcher icon is a
            // functional-but-unpolished placeholder for now.
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(tapIntent)
            .addAction(0, "Deny", denyIntent)
            .addAction(0, "Approve", approveIntent);

        notificationManager.notify(notificationId, builder.build());
    }

    /**
     * Builds a societyone://visitor-respond?requestId=...&decision=...&notificationId=...
     * deep link PendingIntent. decision is omitted for a plain tap (just
     * opens the app to the resident dashboard); set to "Approved"/"Denied"
     * for the two action buttons, which the JS-side deep link handler
     * (services/deepLinks.ts) picks up via @capacitor/app's appUrlOpen /
     * getLaunchUrl and uses to call the already-authenticated respond API —
     * this native code never touches auth tokens or makes network calls
     * itself. notificationId is read back out natively by MainActivity,
     * purely to cancel the notification once opened — JS never needs it.
     */
    private PendingIntent buildActivityIntent(int notificationId, String requestId, String decision, int requestCodeOffset) {
        Uri.Builder uriBuilder = new Uri.Builder()
            .scheme("societyone")
            .authority("visitor-respond")
            .appendQueryParameter("requestId", requestId != null ? requestId : "")
            .appendQueryParameter("notificationId", String.valueOf(notificationId));
        if (decision != null) {
            uriBuilder.appendQueryParameter("decision", decision);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uriBuilder.build());
        intent.setClass(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        int requestCode = requestCodeOffset + (requestId != null ? requestId.hashCode() : 0);
        return PendingIntent.getActivity(this, requestCode, intent, flags);
    }

    private void ensureChannel(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts when a visitor is waiting for your approval at the gate.");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[] { 0, 500, 250, 500, 250, 500 });
            channel.enableLights(true);

            // The device's actual default RINGTONE (not the quieter default
            // NOTIFICATION tone) — plays on the ringtone volume stream,
            // which is usually turned up louder than notification volume,
            // and is what most people already associate with "something
            // needs my attention right now" the way a phone call does.
            Uri ringtoneUri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(ringtoneUri, audioAttributes);

            notificationManager.createNotificationChannel(channel);
        }
    }
}
