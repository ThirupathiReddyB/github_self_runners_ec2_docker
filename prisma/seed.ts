import { awsBucketLink } from "../src/constants/data";
import prisma from "../src/prisma";
import HTTPError from "../src/utility/HttpError";

async function main() {
  //subscription seed - initial

  const findFreePlan = await prisma.plan.upsert({
    where: {
      planCode: "free_000",
    },
    update: {
      name: "Free Plan",
      planCode: "free_000",
      notes: "Free plan for all users",
      updatedBy: "system"
    },
    create: {
      name: "Free Plan",
      planCode: "free_000",
      notes: "Free plan for all users",
      updatedBy: "system"
    }
  });
  if (!findFreePlan) {
    throw new HTTPError("free plan could not be created/updated", 404);
  }

  const findPremiumPlan = await prisma.plan.upsert({
    where: {
      planCode: "premium_7698",
    },
    update: {
      name: "Premium Plan",
      planCode: "premium_7698",
      notes: "Premium plan for all users",
      updatedBy: "system"
    },
    create: {
      name: "Premium Plan",
      planCode: "premium_7698",
      notes: "Premium plan for all users",
      updatedBy: "system"
    }
  });
  if (!findPremiumPlan) {
    throw new HTTPError("premium plan could not be created/updated", 404);
  }

  await prisma.$transaction([
    //===============================================================================================
    //Dashboard User
    prisma.dashboardUser.createMany({
      data: [
        // {
        //   fullName: "Parag Utekar",
        //   emailId: "utekar.parag@steigenhealthcare.com",
        //   role: "superAdmin",
        //   position: "Owner",
        // },
        // {
        //   fullName: "Narayan Asalkar",
        //   emailId: "naas@ciklum.com",
        //   role: "superAdmin",
        //   position: "Q.A",
        // },
        {
          fullName: "Pratik Kamble",
          emailId: "pratik.kamble@dynamisch.co",
          role: "superAdmin",
          position: "Developer",
        },
        // {
        //   fullName: "Marufa Mukadam",
        //   emailId: "megan.fernandes@dynamsich.co",
        //   role: "superAdmin",
        //   position: "Developer",
        // },
        // {
        //   fullName: "Sneha Kudchadkar",
        //   emailId: "sneha.kudchadkar@dynamisch.co",
        //   role: "superAdmin",
        //   position: "Manager",
        // },
        // {
        //   fullName: "Megan Fernandes",
        //   emailId: "megan.fernandes@dynamisch.co",
        //   role: "superAdmin",
        //   position: "Developer",
        // },
        // {
        //   fullName: "Tech",
        //   emailId: "tech@steigenhealthcare.com",
        //   role: "admin",
        //   position: "tester",
        // },
        // {
        //   fullName: "MKTG",
        //   emailId: "mktg@steigenhealthcare.com",
        //   role: "auditor",
        //   position: "tester",
        // },
      ],
    }),

    //===============================================================================================
    //Vital Module
    prisma.vitalModule.createMany({
      data: [
        // {
        //   vitalName: "BMI",
        //   vitalCode: "bmi02",
        //   updatedBy: "mef@ciklum.com",
        //   vitalDataStructure: [
        //     {
        //       metric: "height",
        //       dataType: "float",
        //       units: ["cm", "m", "in"],
        //     },
        //     {
        //       metric: "weight",
        //       dataType: "float",
        //       units: ["kg", "lbs", "ounce"],
        //     },
        //   ],
        //   filters: [],
        // },
        // {
        //   vitalName: "period diary",
        //   vitalCode: "period01",
        //   updatedBy: "mef@ciklum.com",
        //   vitalDataStructure: [
        //     {
        //       metric: "startDate",
        //       dataType: "DateTime",
        //       units: [],
        //     },
        //     {
        //       metric: "cycle",
        //       dataType: "Integer",
        //       units: [],
        //     },
        //     {
        //       metric: "isPCOD",
        //       dataType: "boolean",
        //       units: [],
        //     },
        //   ],
        //   filters: [
        //     {
        //       key: "gender",
        //       value: "female",
        //     },
        //     {
        //       key: "gender",
        //       value: "other",
        //     },
        //   ],
        // },
        // {
        //   vitalName: "blood pressure",
        //   vitalCode: "bp03",
        //   updatedBy: "mef@ciklum.com",
        //   vitalDataStructure: [
        //     {
        //       metric: "systole",
        //       dataType: "float",
        //       units: [],
        //     },
        //     {
        //       metric: "diastole",
        //       dataType: "float",
        //       units: [],
        //     },
        //   ],
        //   filters: [
        //     {
        //       key: "age",
        //       value: "20",
        //     },
        //   ],
        // },
        // {
        //   vitalName: "blood glucose",
        //   vitalCode: "bg04",
        //   updatedBy: "mef@ciklum.com",
        //   vitalDataStructure: [
        //     {
        //       metric: "glucose level",
        //       dataType: "float",
        //       units: [],
        //     },
        //   ],
        //   filters: [],
        // },
        // {
        //   vitalName: "Waist-Hip Ratio",
        //   vitalCode: "whr05",
        //   updatedBy: "mef@ciklum.com",
        //   vitalDataStructure: [
        //     {
        //       metric: "waist",
        //       dataType: "float",
        //       units: ["cm", "m", "in"],
        //     },
        //     {
        //       metric: "hip",
        //       dataType: "float",
        //       units: ["cm", "m", "in"],
        //     },
        //   ],
        //   filters: [],
        // },
        {
          vitalName: "Insuline",
          vitalCode: "insuline06",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [
            {
              metric: "insulinReading",
              dataType: "number",
              units: [],
            },
            {
              metric: "insulinType",
              dataType: "string",
              units: [],
            },
            {
              metric: "insulinUnit",
              dataType: "string",
              units: ["U-100", "U-200", "U-300", "U-500", "U-40"],
            },
          ],
          filters: [],
        },
        //Heart rate-hr07
        // Blood Oxygen- bo08
        // Stress- stress09
        // Sleep Monitoring - sm10
        // Steps tracking-st11
        {
          vitalName: "Heart rate",
          vitalCode: "hr07",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [],
          filters: [],
        },
        {
          vitalName: "Blood Oxygen",
          vitalCode: "bo08",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [],
          filters: [],
        },
        {
          vitalName: "Stress",
          vitalCode: "stress09",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [],
          filters: [],
        },
        {
          vitalName: "Sleep monitoring",
          vitalCode: "sm10",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [],
          filters: [],
        },
        {
          vitalName: "Steps tracking",
          vitalCode: "st11",
          updatedBy: "megan.fernandes@dynamsich.co",
          vitalDataStructure: [],
          filters: [],
        },
      ],
    }),

    //===============================================================================================
    //Profile Update
    prisma.profile.upsert({
      where: {
        id: 1
      },
      update: {
        // id: 1,
        name: "Steigen HealthCare India Pvt. Ltd.",
        address:
          "E-101, Suncrest Accolade CHS,Louiswadi, Green Road, Thane (West) - 400604",
        cin: "U58201MH2023PTC415851",
        email: "customer-support@thito.in",
        phoneNumber: "8591844838",
        website: "https://thito.in/",
        gst: 18,
        gstin: "27ABMCS3590F1ZZ",
        msmeNo: "UDYAM-MH-33-044 8466",
        companyLogo: `${awsBucketLink}/assets/1744289163657_thito-logo-orange.png`,
        signatory: `${awsBucketLink}/assets/1744289345394_signatory.png`,
      },
      create: {
        // id: 1,
        name: "Steigen HealthCare India Pvt. Ltd.",
        address:
          "E-101, Suncrest Accolade CHS,Louiswadi, Green Road, Thane (West) - 400604",
        cin: "U58201MH2023PTC415851",
        email: "customer-support@thito.in",
        phoneNumber: "8591844838",
        website: "https://thito.in/",
        gst: 18,
        gstin: "27ABMCS3590F1ZZ",
        msmeNo: "UDYAM-MH-33-044 8466",
        companyLogo: `${awsBucketLink}/assets/1744289163657_thito-logo-orange.png`,
        signatory: `${awsBucketLink}/assets/1744289345394_signatory.png`,
      }
    }),

    //===============================================================================================
    //feature Creation
    prisma.feature.createMany({
      data: [
        {
          id: 1,
          name: "Family Care",
          canonicalName: "family_care",
          description: "number of accounts linkable",
          isActive: true,
        },
        {
          id: 2,
          name: "Health Analysis",
          canonicalName: "health_analysis",
          description: "Modules to track health",
          isActive: true,
        },
        {
          id: 3,
          name: "Videos",
          canonicalName: "video",
          description: "Health and awareness videos",
          isActive: true,
        },
        {
          id: 4,
          name: "Cloud Storage",
          canonicalName: "storage",
          description: "Per user storage",
          isActive: true,
        },
        {
          id: 5,
          name: "Blogs",
          canonicalName: "blog",
          description: "Blogs about health and awareness",
          isActive: false,
        },
        {
          id: 6,
          name: "Reels",
          canonicalName: "reel",
          description:
            "Reels about new features and insights by doctors and experts",
          isActive: true,
        },
        {
          id: 7,
          name: "Stories",
          canonicalName: "story",
          description: "Stories on health insights by doctors and experts",
          isActive: true,
        },
        {
          id: 8,
          name: "SOS",
          canonicalName: "sos",
          description:
            "One Click SOS message to emergency contact and ambulance",
          isActive: true,
        },
        {
          id: 9,
          name: "Appointment Booking",
          canonicalName: "appointment_booking",
          description:
            "Book appointments with spee and ease using THITOn to save time",
          isActive: false,
        },
        {
          id: 10,
          name: "Advertisement",
          canonicalName: "advertisement",
          description: "View promotional and features advertisements",
          isActive: true,
        },
      ],
    }),

    //===============================================================================================
    //Meta Data
    prisma.metadata.createMany({
      data: [
        {
          id: 1,
          featureId: 1, //family_care
          value: {
            minor: 1,
            adult: 1,
            slot: 0,
          },
          remark: "Up to 1 minor + 1 adult",
        },
        {
          id: 2,
          featureId: 1, //family_care
          value: {
            minor: 2,
            adult: 3,
            slot: 0,
          },
          remark: "Up to 2 minors + 3 adults",
        },
        {
          id: 3,
          featureId: 2, //health_analysis
          value: {
            available: true,
          },
          remark: "Health analysis module to manage vital data",
        },
        {
          id: 4,
          featureId: 3, //video
          value: {
            available: true,
          },
          remark: "Videos are available for all users",
        },
        {
          id: 5,
          featureId: 4, //cloud storage
          value: {
            storage: 25,
            unit: "MB",
          },
          remark: "25MB storage for user under free plan",
        },
        {
          id: 6,
          featureId: 4, //cloud storage
          value: {
            storage: 100,
            unit: "MB",
          },
          remark: "100MB storage for user under premium plan",
        },
        {
          id: 7,
          featureId: 5, //blog
          value: {
            available: true,
          },
          remark: "Blogs are available for all users of this plan",
        },
        {
          id: 8,
          featureId: 6, //reel
          value: {
            available: true,
          },
          remark: "Reels are available for all users of this plan",
        },
        {
          id: 9,
          featureId: 7, //story
          value: {
            available: true,
          },
          remark: "Stories are available for all users of this plan",
        },
        {
          id: 10,
          featureId: 10, //advertisement
          value: {
            available: true,
          },
          remark: "Advertisement are available for all users of this plan",
        },
      ],
    }),

    //===============================================================================================
    //Plan Update
    //free - adding unlimited variant
    prisma.plan.update({
      where: {
        planCode: "free_000",
      },
      data: {
        planVariants: {
          update: {
            where: {
              period_interval_planId: {
                period: "unlimited",
                interval: 0,
                planId: findFreePlan.id,
              },
            },
            data: {
              isActive: true,
              isDefault: false,
              PlanToFeature: {
                create: [
                  {
                    featureId: 1,
                    MetadataId: 1,
                  },
                  {
                    featureId: 4,
                    MetadataId: 5,
                  },
                ],
              },
            },
          },
        },
      },
    }),

    //premium - adding 3mo default variant
    prisma.plan.update({
      where: {
        planCode: "premium_7698",
      },
      data: {
        planVariants: {
          update: {
            where: {
              period_interval_planId: {
                period: "monthly",
                interval: 3,
                planId: findPremiumPlan.id,
              },
            },
            data: {
              amount: 599,
              isDefault: true,
              isActive: true,
              PlanToFeature: {
                create: [
                  {
                    featureId: 1,
                    MetadataId: 2,
                  },
                  {
                    featureId: 3,
                    MetadataId: 4,
                  },
                  {
                    featureId: 4,
                    MetadataId: 6,
                  },
                  {
                    featureId: 5,
                    MetadataId: 7,
                  },
                  {
                    featureId: 6,
                    MetadataId: 8,
                  },
                  {
                    featureId: 7,
                    MetadataId: 9,
                  },
                  {
                    featureId: 10,
                    MetadataId: 10,
                  },
                ],
              },
            },
          },
        },
      },
    }),

    //===============================================================================================
    //Plan Variants
    //Prod API And Payment Gateway testing purpose Plan 7mo - Rs 1
    prisma.planVariants.create({
      data: {
        period: "monthly",
        interval: 7,
        name: "Test Plan of 7 months - Rs 1",
        amount: 1,
        updatedBy: "megan.fernandes@dynamsich.co",
        planId: findPremiumPlan.id,
        isActive: true,
        isDefault: false,
        PlanToFeature: {
          create: [
            {
              featureId: 1,
              MetadataId: 2,
            },
            {
              featureId: 3,
              MetadataId: 4,
            },
            {
              featureId: 4,
              MetadataId: 6,
            },
            {
              featureId: 5,
              MetadataId: 7,
            },
            {
              featureId: 6,
              MetadataId: 8,
            },
            {
              featureId: 7,
              MetadataId: 9,
            },
            {
              featureId: 10,
              MetadataId: 10,
            },
          ],
        },
      },
    }),

    //1 month - Rs 249
    prisma.planVariants.create({
      data: {
        period: "monthly",
        interval: 1,
        name: "Monthly",
        amount: 249,
        updatedBy: "megan.fernandes@dynamsich.co",
        planId: findPremiumPlan.id,
        isActive: true,
        isDefault: false,
        PlanToFeature: {
          create: [
            {
              featureId: 1,
              MetadataId: 2,
            },
            {
              featureId: 3,
              MetadataId: 4,
            },
            {
              featureId: 4,
              MetadataId: 6,
            },
            {
              featureId: 5,
              MetadataId: 7,
            },
            {
              featureId: 6,
              MetadataId: 8,
            },
            {
              featureId: 7,
              MetadataId: 9,
            },
            {
              featureId: 10,
              MetadataId: 10,
            },
          ],
        },
      },
    }),

    //6mo - Rs 999
    prisma.planVariants.create({
      data: {
        period: "monthly",
        interval: 6,
        name: "Half Yearly",
        amount: 999,
        updatedBy: "megan.fernandes@dynamsich.co",
        planId: findPremiumPlan.id,
        isActive: true,
        isDefault: false,
        PlanToFeature: {
          create: [
            {
              featureId: 1,
              MetadataId: 2,
            },
            {
              featureId: 3,
              MetadataId: 4,
            },
            {
              featureId: 4,
              MetadataId: 6,
            },
            {
              featureId: 5,
              MetadataId: 7,
            },
            {
              featureId: 6,
              MetadataId: 8,
            },
            {
              featureId: 7,
              MetadataId: 9,
            },
            {
              featureId: 10,
              MetadataId: 10,
            },
          ],
        },
      },
    }),

    //9mo - Rs 1299
    prisma.planVariants.create({
      data: {
        period: "monthly",
        interval: 9,
        name: "Nine Monthly",
        amount: 1299,
        updatedBy: "megan.fernandes@dynamsich.co",
        planId: findPremiumPlan.id,
        isActive: true,
        isDefault: false,
        PlanToFeature: {
          create: [
            {
              featureId: 1,
              MetadataId: 2,
            },
            {
              featureId: 3,
              MetadataId: 4,
            },
            {
              featureId: 4,
              MetadataId: 6,
            },
            {
              featureId: 5,
              MetadataId: 7,
            },
            {
              featureId: 6,
              MetadataId: 8,
            },
            {
              featureId: 7,
              MetadataId: 9,
            },
            {
              featureId: 10,
              MetadataId: 10,
            },
          ],
        },
      },
    }),

    //1yr - Rs 1599
    prisma.planVariants.create({
      data: {
        period: "yearly",
        interval: 1,
        name: "Yearly",
        amount: 1599,
        updatedBy: "megan.fernandes@dynamsich.co",
        planId: findPremiumPlan.id,
        isActive: true,
        isDefault: false,
        PlanToFeature: {
          create: [
            {
              featureId: 1,
              MetadataId: 2,
            },
            {
              featureId: 3,
              MetadataId: 4,
            },
            {
              featureId: 4,
              MetadataId: 6,
            },
            {
              featureId: 5,
              MetadataId: 7,
            },
            {
              featureId: 6,
              MetadataId: 8,
            },
            {
              featureId: 7,
              MetadataId: 9,
            },
            {
              featureId: 10,
              MetadataId: 10,
            },
          ],
        },
      },
    }),

    //===============================================================================================
    //FAQs
    prisma.fAQS.upsert({
      where: { id: 1 },
      update: {
        question: "Why did my payment fail?",
        answer:
          "Payment failures can occur for various reasons, including insufficient funds, incorrect card details, expired cards, or network-related issues. Please review the error message codes and ensure your payment information is correct. If the issue persists, we recommend contacting your bank or financial institution for further assistance.",
        type: "payment",
      },
      create: {
        id: 1,
        question: "Why did my payment fail?",
        answer:
          "Payment failures can occur for various reasons, including insufficient funds, incorrect card details, expired cards, or network-related issues. Please review the error message codes and ensure your payment information is correct. If the issue persists, we recommend contacting your bank or financial institution for further assistance.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 2 },
      update: {
        question: "Are there any transaction fees?",
        answer:
          "No, there are no additional transaction fees for payments made through Thito.",
        type: "payment",
      },
      create: {
        id: 2,
        question: "Are there any transaction fees?",
        answer:
          "No, there are no additional transaction fees for payments made through Thito.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 3 },
      update: {
        question: "Can I cancel my subscription?",
        answer:
          "Unfortunately, subscriptions cannot be cancelled. If you wish to stop your subscription, please ensure you do not renew it.",
        type: "payment",
      },
      create: {
        id: 3,
        question: "Can I cancel my subscription?",
        answer:
          "Unfortunately, subscriptions cannot be cancelled. If you wish to stop your subscription, please ensure you do not renew it.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 4 },
      update: {
        question: "What should I do if a transaction fails?",
        answer:
          "If your transaction fails, we recommend contacting your bank or payment provider for further clarification and assistance.",
        type: "payment",
      },
      create: {
        id: 4,
        question: "What should I do if a transaction fails?",
        answer:
          "If your transaction fails, we recommend contacting your bank or payment provider for further clarification and assistance.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 5 },
      update: {
        question: "Which payment methods does Thito support?",
        answer:
          "Thito supports a variety of payment methods, including: Credit/Debit Cards, Net Banking, UPI Payments",
        type: "payment",
      },
      create: {
        id: 5,
        question: "Which payment methods does Thito support?",
        answer:
          "Thito supports a variety of payment methods, including: Credit/Debit Cards, Net Banking, UPI Payments",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 6 },
      update: {
        question: "Can I get a refund if I don’t like the app?",
        answer:
          "Refunds are not offered based on personal preferences or dissatisfaction with the app. As outlined in our Terms & Conditions, all sales are final, and no refunds will be provided. By subscribing, you confirm that you have read, understood, and accepted this policy.",
        type: "payment",
      },
      create: {
        id: 6,
        question: "Can I get a refund if I don’t like the app?",
        answer:
          "Refunds are not offered based on personal preferences or dissatisfaction with the app. As outlined in our Terms & Conditions, all sales are final, and no refunds will be provided. By subscribing, you confirm that you have read, understood, and accepted this policy.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 7 },
      update: {
        question: "Do I need to renew my subscription?",
        answer:
          "Yes, once your subscription expires, you will need to renew it to continue accessing the app’s premium features.",
        type: "payment",
      },
      create: {
        id: 7,
        question: "Do I need to renew my subscription?",
        answer:
          "Yes, once your subscription expires, you will need to renew it to continue accessing the app’s premium features.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 8 },
      update: {
        question: "Is the subscription auto-renewable?",
        answer:
          "No, subscriptions are not set to auto-renew. You will need to manually renew your subscription when it expires.",
        type: "payment",
      },
      create: {
        id: 8,
        question: "Is the subscription auto-renewable?",
        answer:
          "No, subscriptions are not set to auto-renew. You will need to manually renew your subscription when it expires.",
        type: "payment",
      },
    }),
    prisma.fAQS.upsert({
      where: { id: 9 },
      update: {
        question: "Can I use the Thito app without a subscription?",
        answer:
          "Thito offers some basic features without a subscription. However, to access the full range of premium features, a valid subscription is required.",
        type: "payment",
      },
      create: {
        id: 9,
        question: "Can I use the Thito app without a subscription?",
        answer:
          "Thito offers some basic features without a subscription. However, to access the full range of premium features, a valid subscription is required.",
        type: "payment",
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
