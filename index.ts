import express, { Express, Request, response, Response } from 'express';
import {
    AppleNotification,
    createAppleInstallation,
    createAppleNotification,
    createFcmLegacyInstallation,
    createFcmLegacyNotification,
    FcmLegacyNotification,
    NotificationHubsClient,
} from "@azure/notification-hubs";
import { DeviceInstallation, NotificationRequest } from './src/models/notification.model';

const app: Express = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3000;
const azureConfig = {
    connectionString: '',
    hubName: '',
}


const initNotificationHubsClient = () => {
    return new NotificationHubsClient(azureConfig.connectionString, azureConfig.hubName);
}

app.get('/', (req: Request, res: Response) => {
    res.send('hello world');
});

app.listen(port, () => {
    console.log(`[Server]: I am running at http://localhost:${port}`);
});

app.post('/notifications/installation', async (req: Request, res: Response) => {
    const success = await createOrUpdateInstallationAsync(req.body);
    if (success) {
        res.send('Device is successfully registered')
    } else {
        res.send('Fail')
    };
});

const createOrUpdateInstallationAsync = async (deviceInstallation: DeviceInstallation) => {
    const notificationHubClient = initNotificationHubsClient();
    if (!deviceInstallation?.installationId ||
        !deviceInstallation?.platform ||
        !deviceInstallation?.pushChannel
    ) {
        return false;
    }

    let installation;

    if (deviceInstallation.platform == 'apns') {
        installation = createAppleInstallation(deviceInstallation);
    } else if (deviceInstallation.platform == 'fcm') {
        installation = createFcmLegacyInstallation(deviceInstallation);
    } else {
        return false;
    }

    try {
        await notificationHubClient.createOrUpdateInstallation(installation);
    }
    catch
    {
        return false;
    }
    return true;
}

app.delete('/notifications/delete-installation', async (req: Request, res: Response) => {
    let installationId = req.query?.installationId as string;
    const success = await deleteInstallationByIdAsync(installationId);
    if (success) {
        res.send('Success');
    } else {
        res.send('Fail');
    }
});

const deleteInstallationByIdAsync = async (installationId: string) => {
    const notificationHubClient = initNotificationHubsClient();
    if (!installationId) {
        return false;
    }
    try {
        await notificationHubClient.deleteInstallation(installationId);
    }
    catch
    {
        return false;
    }
    return true;
}

app.post('/notifications/push-notification', (req: Request, res: Response) => {
    console.log(req.body);
    requestNotificationAsync(req.body);
    res.send('Success')
});

const requestNotificationAsync = async (notificationRequest: NotificationRequest) => {
    let notifications: any[] = [];
    let platform = [];
    if(typeof notificationRequest.platform == 'string') {
        platform = [notificationRequest.platform];
    } else {
        platform = [...notificationRequest.platform]
    }
    platform.forEach(p => {
        let messageBody = {};
        switch (p) {
            case 'ios':
                messageBody = {
                    "aps": {
                        "alert": {
                            "title": notificationRequest.title,
                            "body": notificationRequest.message
                        },
                        "sound": "default"
                    }
                }
                notifications.push(
                    createAppleNotification({
                        body: JSON.stringify(messageBody),
                        headers: {
                            "apns-priority": "10",
                            "apns-push-type": "alert",
                        },
                    })
                )
                break;
            case 'android':
                messageBody = {
                    "notification": {
                        "title": notificationRequest.title,
                        "body": notificationRequest.message
                    }
                }
                notifications.push(
                    createFcmLegacyNotification({
                        body: JSON.stringify(messageBody),
                    })
                )
                break;
            default:
                break;
        }
    })

    if (notifications.length == 0) {
        return false;
    } else {
        notifications.forEach(n => sendNotification(n));
    }
}

const sendNotification = async (notification: AppleNotification | FcmLegacyNotification) => {
    // Can set enableTestSend to true for debugging purposes
    const notificationHubClient = initNotificationHubsClient();
    const result = await notificationHubClient.sendNotification(notification, { enableTestSend: false });
    console.log(`Tag List send Tracking ID: ${result.trackingId}`);
    console.log(`Tag List Correlation ID: ${result.correlationId}`);
}