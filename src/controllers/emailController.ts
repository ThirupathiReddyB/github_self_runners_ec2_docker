import { Request, Response } from "express";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import fs from "fs";
import { emailHost, emailPort, emailService } from "../../config/emailConfig";
import prisma from "../prisma";

dotenv.config();

// Batch size for pagination
const BATCH_SIZE = 1000;

export const exportUsersExcel = async (req: Request, res: Response) => {
  try {
    let skip = 0;
    let hasMoreData = true;

    // Extracts filter and search params
    const { filter, searchBy, searchValue } = req.query;

    let whereClause: any = {};
    //Filters

    switch (filter) {
      case "primary":
        whereClause = { dependant: { none: {} } };
        break;
      case "minor":
        whereClause = { dependant: { some: {} } };
        break;
      case "reset":
        whereClause = {};
        break;
      default:
        console.log("Invalid filter type");
    }

    // Apply Search Filters
    if (searchBy && searchValue) {
      switch (searchBy) {
        case "name":
          whereClause.fullName = { contains: searchValue, mode: "insensitive" };
          break;
        case "uid":
          whereClause.id = { contains: searchValue, mode: "insensitive" };
          break;
        case "gender":
          whereClause.gender = searchValue;
          break;
        case "contact":
          whereClause.phoneNumber = { contains: searchValue };
          break;
        case "country":
          whereClause.country = { contains: searchValue, mode: "insensitive" };
          break;
        case "pincode":
          whereClause.pincode = { contains: searchValue };
          break;
        default:
          console.log("Invalid filter type");
      }
    }
    // Create new Excel workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // Add heading
    worksheet.mergeCells("A1:H1");
    const headerCell = worksheet.getCell("A1");
    headerCell.value = "Steigen";
    headerCell.alignment = { horizontal: "center", vertical: "middle" };
    headerCell.font = { bold: true, size: 14 };

    // Empty rows for spacing
    worksheet.addRow([]);
    worksheet.addRow([]);

    //column headers
    const columnHeaders = [
      "Name",
      "UID",
      "Gender",
      "Contact",
      "Country",
      "Pin Code",
      "User", // Primary or Minor
      "Account", // In Use/Blocked
    ];
    worksheet.addRow(columnHeaders).font = { bold: true };

    // Set column widths
    worksheet.columns = [
      { key: "fullName", width: 25 },
      { key: "id", width: 15 },
      { key: "gender", width: 10 },
      { key: "phoneNumber", width: 20 },
      { key: "country", width: 15 },
      { key: "pincode", width: 10 },
      { key: "userType", width: 15 }, // Primary/Minor
      { key: "isBlocked", width: 15 }, // 'In Use'/'Blocked'
    ];

    // Process data in batches
    while (hasMoreData) {
      // Fetches users based on filters
      const users = await prisma.users.findMany({
        where: whereClause,
        select: {
          fullName: true,
          id: true,
          gender: true,
          phoneNumber: true,
          country: true,
          pincode: true,
          isBlocked: true,
          dependant: { select: { id: true } }, // Fetches dependants to check if user is minor
        },
        skip: skip,
        take: BATCH_SIZE,
      });

      // Add data rows
      users.forEach((user) => {
        worksheet.addRow({
          fullName: user.fullName,
          id: user.id,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          country: user.country,
          pincode: user.pincode,
          userType: user.dependant.length > 0 ? "Minor" : "Primary", // Check if user has dependants
          isBlocked: user.isBlocked ? "In Use" : "Blocked", // Convert true/false
        });
      });

      // Check if more users exist
      if (users.length < BATCH_SIZE) {
        hasMoreData = false;
      } else {
        skip += BATCH_SIZE;
      }
    }

    // Save Excel file
    const filePath = path.join(__dirname, "users.xlsx");
    await workbook.xlsx.writeFile(filePath);

    // Sends Email with Attachment
    const transporter = nodemailer.createTransport({
      service: emailService,
      host: emailHost,
      port: emailPort,
      auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_ID,
      to: "tpar@ciklum.com", //add email to whom you want to send
      subject: "User Data Excel Export",
      text: "Attached is the user data in Excel format.",
      attachments: [{ filename: "users.xlsx", path: filePath }],
    };

    await transporter.sendMail(mailOptions);

    // Deletes file after sending
    fs.unlinkSync(filePath);

    res.json({ message: "Excel file sent successfully!" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
