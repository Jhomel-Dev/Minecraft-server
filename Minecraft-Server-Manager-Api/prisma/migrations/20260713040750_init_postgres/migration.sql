-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "refreshToken" TEXT,
    "agentToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VANILLA',
    "version" TEXT NOT NULL DEFAULT 'LATEST',
    "memory" TEXT NOT NULL DEFAULT '2G',
    "port" INTEGER NOT NULL DEFAULT 25565,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "maxPlayers" INTEGER NOT NULL DEFAULT 20,
    "whitelist" BOOLEAN NOT NULL DEFAULT false,
    "onlineMode" BOOLEAN NOT NULL DEFAULT true,
    "tunnelIp" TEXT,
    "tunnelSecret" TEXT,
    "customDomain" TEXT,
    "claimLink" TEXT,
    "isCloud" BOOLEAN NOT NULL DEFAULT false,
    "compatibilityMode" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_agentToken_key" ON "User"("agentToken");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
