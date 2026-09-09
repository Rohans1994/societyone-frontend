package com.societyone.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        cancelVisitorNotificationIfPresent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        cancelVisitorNotificationIfPresent(intent);
    }

    /**
     * The visitor-request notification's Approve/Deny action buttons open
     * this activity directly via a plain PendingIntent.getActivity() (see
     * VisitorMessagingService) so Android's background-activity-launch
     * exemption for notification taps applies and the app opens
     * immediately/reliably — routing through a BroadcastReceiver first was
     * tried and removed because it lost that exemption and delayed opening
     * until the app was launched manually. setAutoCancel() only
     * auto-dismisses on a tap of the notification body itself, not action
     * buttons, so this explicitly cancels it here once the app has actually
     * opened as a result of one of those taps.
     */
    private void cancelVisitorNotificationIfPresent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null || !"societyone".equals(data.getScheme()) || !"visitor-respond".equals(data.getHost())) {
            return;
        }
        String notificationIdParam = data.getQueryParameter("notificationId");
        if (notificationIdParam == null) return;
        try {
            int notificationId = Integer.parseInt(notificationIdParam);
            NotificationManagerCompat.from(this).cancel(notificationId);
        } catch (NumberFormatException ignored) {
        }
    }
}
