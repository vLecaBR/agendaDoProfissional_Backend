/*
  Warnings:

  - Added the required column `clientWhatsapp` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professionalId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "clientWhatsapp" TEXT NOT NULL,
ADD COLUMN     "professionalId" TEXT NOT NULL,
ADD COLUMN     "serviceType" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
