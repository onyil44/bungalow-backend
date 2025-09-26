"use strict";

import nodemailer from "nodemailer";

export default class Email {
  constructor(person, url = "https://bungalow.onyilprojects.com", pnrCode) {
    this.to = person.email;
    this.fullName = person.fullName;
    this.userRole = person.role || null;
    this.from = `Forest Bungalows <${process.env.EMAIL_FROM}>`;
    this.url = url;
    this.pnrCode = pnrCode || null;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "mailhog",
      port: Number(process.env.EMAIL_PORT) || 1025,
      secure: process.env.EMAIL_SECURE === "true",
      auth: undefined,
      // auth: {
      //   user: process.env.EMAIL_USERNAME,
      //   pass: process.env.EMAIL_PASSWORD,
      // },
    });
  }

  async send(subject, text) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text,
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      "Account Created",
      `Hello ${this.fullName}. Your ${this.userRole} account has been created please visit the link to create a password and login. ${this.url}`
    );
  }

  async sendBookingCreated() {
    await this.send(
      `Booking Created`,
      `Hello Dear ${this.fullName}; Your booking created with ${this.pnrCode} PNR code.`
    );
  }

  async sendResetPassword() {
    await this.send(
      "Create New Password",
      `Hello ${this.fullName}. Please click the following link to create new password.${this.url}`
    );
  }

  //   async sendWellcomeSupplier() {
  //     await this.send(
  //       "Supplier Account Created",
  //       `Hello ${this.operatorCompany.companyName}. An importer has registered your email address as a supplier on myCABMrepot.com. Please click the blow link to create a supplier acoount.${this.url}`
  //     );
  //   }

  //   async sendAddCompanyRequest() {
  //     await this.send(
  //       `New Supplier Add Request`,
  //       `Hello${this.firstName ? " " + this.firstName : ``}.${
  //         this.importerCompany.companyName
  //       } request you to create ${
  //         this.operatorCompany.companyName
  //       } as a supplier on myCBAMreport.com to add the company its suplier list. ${
  //         this.url === "https://www.mycmabreport.com"
  //           ? `Please login to create and add the company to your potrfolio. If you has a company in your portfolio with the same name, please inform the importer. ${this.url}`
  //           : `Your account has not been activated yet. Please click the below link and activate your account first. ${this.url}`
  //       }`
  //     );
  //   }

  //   async sendAddCompanyInformation() {
  //     await this.send(
  //       `Your Company Added As A Supplier`,
  //       `Hello${this.firstName ? " " + this.firstName : ``}.${
  //         this.importerCompany.companyName
  //       } added ${
  //         this.operatorCompany.companyName
  //       } as a supplier in their supplier list on myCBAMreport.com. ${
  //         this.url === "https://www.mycmabreport.com"
  //           ? this.url
  //           : `Your account has not been activated yet. Please click the below link and activate your account first. ${this.url}`
  //       }`
  //     );
  //   }

  //   async informSupplierHiddenCompany() {
  //     await this.send(
  //       `Hidden Company Add Request`,
  //       `Hello${this.firstName ? " " + this.firstName : ``}.${
  //         this.importerCompany.companyName
  //       } request to add ${
  //         this.operatorCompany.companyName
  //       } as a supplier its own supplier list. Since ${
  //         this.operatorCompany.companyName
  //       } is not shown to all importers because it is not allowed by you, ${
  //         this.importerCompany.companyName
  //       } could not add your company as a supplier to the supplier list. Please allow your company to be visible or create a new company and inform the importer company. ${
  //         this.url === "https://www.mycmabreport.com"
  //           ? this.url
  //           : `Your account has not been activated yet. Please click the below link and activate your account first. ${this.url}`
  //       }`
  //     );
  //   }

  //   async approvedImporter() {
  //     await this.send(
  //       `Supplier Approved Your Add Request`,
  //       `Dear${
  //         this.firstName ? " " + this.firstName : ``
  //       }; Your supplier company (${
  //         this.operatorCompany.companyName
  //       }) add request has been approved. You can reach ${
  //         this.operatorCompany.companyName
  //       }'s production process and innstalliation data. ${this.url}`
  //     );
  //   }

  //   async rejectedImporter() {
  //     await this.send(
  //       `Supplier Rejected Your Add Request`,
  //       `Dear${
  //         this.firstName ? " " + this.firstName : ``
  //       }; Your supplier company (${
  //         this.operatorCompany.companyName
  //       }) add request  has been rejected. ${this.url}`
  //     );
  //   }
}
