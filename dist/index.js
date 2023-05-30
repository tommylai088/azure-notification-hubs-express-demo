"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_hubs_1 = require("@azure/notification-hubs");
const app = (0, express_1.default)();
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
const port = process.env.PORT || 3000;
const azureConfig = {
    connectionString: '',
    hubName: '',
};
const initNotificationHubsClient = () => {
    return new notification_hubs_1.NotificationHubsClient(azureConfig.connectionString, azureConfig.hubName);
};
app.get('/', (req, res) => {
    res.send('hello world');
});
app.listen(port, () => {
    console.log(`[Server]: I am running at http://localhost:${port}`);
});
app.post('/notifications/installation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const success = yield createOrUpdateInstallationAsync(req.body);
    if (success) {
        res.send('Device is successfully registered');
    }
    else {
        res.send('Fail');
    }
    ;
}));
const createOrUpdateInstallationAsync = (deviceInstallation) => __awaiter(void 0, void 0, void 0, function* () {
    const notificationHubClient = initNotificationHubsClient();
    if (!(deviceInstallation === null || deviceInstallation === void 0 ? void 0 : deviceInstallation.installationId) ||
        !(deviceInstallation === null || deviceInstallation === void 0 ? void 0 : deviceInstallation.platform) ||
        !(deviceInstallation === null || deviceInstallation === void 0 ? void 0 : deviceInstallation.pushChannel)) {
        return false;
    }
    let installation;
    if (deviceInstallation.platform == 'apns') {
        installation = (0, notification_hubs_1.createAppleInstallation)(deviceInstallation);
    }
    else if (deviceInstallation.platform == 'fcm') {
        installation = (0, notification_hubs_1.createFcmLegacyInstallation)(deviceInstallation);
    }
    else {
        return false;
    }
    try {
        yield notificationHubClient.createOrUpdateInstallation(installation);
    }
    catch (_a) {
        return false;
    }
    return true;
});
app.delete('/notifications/delete-installation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    let installationId = (_b = req.query) === null || _b === void 0 ? void 0 : _b.installationId;
    const success = yield deleteInstallationByIdAsync(installationId);
    if (success) {
        res.send('Success');
    }
    else {
        res.send('Fail');
    }
}));
const deleteInstallationByIdAsync = (installationId) => __awaiter(void 0, void 0, void 0, function* () {
    const notificationHubClient = initNotificationHubsClient();
    if (!installationId) {
        return false;
    }
    try {
        yield notificationHubClient.deleteInstallation(installationId);
    }
    catch (_c) {
        return false;
    }
    return true;
});
app.post('/notifications/push-notification', (req, res) => {
    console.log(req.body);
    requestNotificationAsync(req.body);
    res.send('Success');
});
const requestNotificationAsync = (notificationRequest) => __awaiter(void 0, void 0, void 0, function* () {
    let notifications = [];
    let platform = [];
    if (typeof notificationRequest.platform == 'string') {
        platform = [notificationRequest.platform];
    }
    else {
        platform = [...notificationRequest.platform];
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
                };
                notifications.push((0, notification_hubs_1.createAppleNotification)({
                    body: JSON.stringify(messageBody),
                    headers: {
                        "apns-priority": "10",
                        "apns-push-type": "alert",
                    },
                }));
                break;
            case 'android':
                messageBody = {
                    "notification": {
                        "title": notificationRequest.title,
                        "body": notificationRequest.message
                    }
                };
                notifications.push((0, notification_hubs_1.createFcmLegacyNotification)({
                    body: JSON.stringify(messageBody),
                }));
                break;
            default:
                break;
        }
    });
    if (notifications.length == 0) {
        return false;
    }
    else {
        notifications.forEach(n => sendNotification(n));
    }
});
const sendNotification = (notification) => __awaiter(void 0, void 0, void 0, function* () {
    // Can set enableTestSend to true for debugging purposes
    const notificationHubClient = initNotificationHubsClient();
    const result = yield notificationHubClient.sendNotification(notification, { enableTestSend: false });
    console.log(`Tag List send Tracking ID: ${result.trackingId}`);
    console.log(`Tag List Correlation ID: ${result.correlationId}`);
});
