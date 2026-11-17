CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"state" varchar(50) DEFAULT 'DRAFT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"resource_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_resources_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("resource_id") ON DELETE no action ON UPDATE no action;