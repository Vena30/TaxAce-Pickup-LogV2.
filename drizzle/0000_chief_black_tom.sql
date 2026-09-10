CREATE TYPE "public"."comm_status" AS ENUM('Not Contacted', 'Left Voicemail', 'Called No Answer', 'Spoke to Client', 'Email Sent');--> statement-breakpoint
CREATE TYPE "public"."printed_copy" AS ENUM('Yes', 'No');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tax_status" AS ENUM('In Vault', 'Contacted', 'Scheduled', 'Prepped for Pickup', 'Picked Up', 'Prepped for Mail', 'Mailed', 'Prep to Shred', 'Shredded', 'Hold');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"notes" text,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstName" varchar(128) NOT NULL,
	"lastName" varchar(128) NOT NULL,
	"spouseName" varchar(256),
	"spouseFirstName" varchar(128),
	"spouseLastName" varchar(128),
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dismissed_duplicates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client1Id" integer NOT NULL,
	"client2Id" integer NOT NULL,
	"dismissedBy" varchar(256),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"taxYearRecordId" integer NOT NULL,
	"userId" integer,
	"userName" varchar(256),
	"changeType" varchar(64) NOT NULL,
	"fieldChanged" varchar(128),
	"oldValue" text,
	"newValue" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staffUsers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(256) NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"mustChangePassword" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp,
	CONSTRAINT "staffUsers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tax_year_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer,
	"businessId" integer,
	"taxYear" integer NOT NULL,
	"status" "tax_status" DEFAULT 'In Vault' NOT NULL,
	"commStatus" "comm_status" DEFAULT 'Not Contacted' NOT NULL,
	"commDate" timestamp,
	"statusDate" timestamp,
	"printedCopy" "printed_copy",
	"datePickedUp" date,
	"dateShredded" date,
	"locationVaultSlot" varchar(128),
	"notes" text,
	"isArchived" boolean DEFAULT false NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
