export interface DeviceInstallation {
    installationId: string;
    platform: string;
    pushChannel: string;
    tags: string[];
}

export interface NotificationRequest {
    title: string;
    message: string;
    platform: string | string[];
}
