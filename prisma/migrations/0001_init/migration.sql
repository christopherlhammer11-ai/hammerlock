-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingType" TEXT NOT NULL DEFAULT 'onetime',
    "stripeCustomerId" TEXT,
    "stripeSessionId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "customerEmail" TEXT,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "boosterUnits" INTEGER NOT NULL DEFAULT 0,
    "boosterSubscriptionId" TEXT,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "activatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DownloadLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'get-app',
    "platform" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE UNIQUE INDEX "License_stripeSessionId_key" ON "License"("stripeSessionId");

-- CreateIndex
CREATE INDEX "License_stripeCustomerId_idx" ON "License"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "License_customerEmail_idx" ON "License"("customerEmail");

-- CreateIndex
CREATE INDEX "License_deviceId_idx" ON "License"("deviceId");

-- CreateIndex
CREATE INDEX "DownloadLead_email_idx" ON "DownloadLead"("email");

