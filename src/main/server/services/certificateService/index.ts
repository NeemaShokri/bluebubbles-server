import * as path from "path";
import * as fs from "fs";
import { pki, md } from "node-forge";

import { ServerConfigChange } from "@server/databases/server";
import { Server } from "@server/index";
import { FileSystem } from "@server/fileSystem";
import { certSubject, validForDays, millisADay } from "./constants";

export class CertificateService {
    static get certPath(): string {
        return path.join(FileSystem.certsDir, "server.pem");
    }

    static get keyPath(): string {
        return path.join(FileSystem.certsDir, "server.key");
    }

    static get expirationPath(): string {
        return path.join(FileSystem.certsDir, "expiration.txt");
    }

    static start() {
        // Listen for config changes
        CertificateService.createListener();

        // See if we need to refresh the certificate
        CertificateService.refreshCertificate();
    }

    private static refreshCertificate() {
        let shouldRefresh = false;

        // If the file doesn't exist, definitely refresh it
        if (!CertificateService.certificateExists()) {
            shouldRefresh = true;
        }

        // If we have the certificate, check if it's expired
        if (!shouldRefresh) {
            try {
                const pem = fs.readFileSync(CertificateService.certPath, { encoding: "utf-8" });
                const cert = pki.certificateFromPem(pem);
                const now = new Date().getTime();
                if (now > cert.validity.notAfter.getTime()) {
                    shouldRefresh = true;
                }
            } catch (ex: any) {
                Server().log("Failed to read certificate expiration! It may have been modified.", "warn");
                shouldRefresh = true;
            }
        }

        // If the certificate doesn't exist, create it
        if (!CertificateService.certificateExists()) {
            Server().log("Certificate doesn't exist or is expired! Regenerating...");
            CertificateService.generateCertificate();
            Server().httpService.restart();
        }
    }

    private static createListener() {
        Server().on("config-update", (args: ServerConfigChange) => CertificateService.handleConfigUpdate(args));
    }

    private static certificateExists() {
        return fs.existsSync(CertificateService.certPath) && fs.existsSync(CertificateService.keyPath);
    }

    private static removeCertificate() {
        fs.unlinkSync(CertificateService.certPath);
        fs.unlinkSync(CertificateService.keyPath);
    }

    static handleConfigUpdate({ prevConfig, nextConfig }: ServerConfigChange): Promise<void> {
        if (
            prevConfig.password === nextConfig.password &&
            nextConfig.proxy_service !== "Dynamic DNS" &&
            prevConfig.proxy_service !== nextConfig.proxy_service
        )
            return;

        if (prevConfig.password !== nextConfig.password) {
            Server().log("Password changed, generating new certificate");
            CertificateService.generateCertificate();
            Server().httpService.restart();
        } else if (
            prevConfig.proxy_service !== nextConfig.proxy_service &&
            nextConfig.proxy_service === "Dynamic DNS"
        ) {
            Server().log("Proxy service changed to dynamic DNS. Refreshing certificate");
            CertificateService.refreshCertificate();
            Server().httpService.restart();
        }
    }

    static generateCertificate() {
        // Generate a keypair and create an X.509v3 certificate
        const keys = pki.rsa.generateKeyPair(2048);

        // Create the certificate
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;

        // Calculate expiration
        const now = new Date().getTime();
        const expiration = new Date(now + validForDays * millisADay);

        // Fill in the required fields
        cert.serialNumber = "01";
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = expiration;
        cert.setSubject(certSubject);
        cert.setIssuer(certSubject);

        // self-sign certificate
        cert.sign(keys.privateKey, md.sha256.create());

        // Remove the old certificate if they exist
        if (CertificateService.certificateExists()) {
            CertificateService.removeCertificate();
        }

        // Convert a Forge certificate to PEM
        const pem = pki.certificateToPem(cert);
        const key = pki.privateKeyToPem(keys.privateKey);
        fs.writeFileSync(CertificateService.certPath, pem);
        fs.writeFileSync(CertificateService.keyPath, key);
    }
}
