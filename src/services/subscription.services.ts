import { IGetCommon } from "../utility/DataTypes/types.common";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";
import prisma from "../prisma";
import { getPlan } from "./plan.services";
import { getFeature } from "./feature.services";
import { getVoucher } from "./voucher.services";
import { getAddon } from "./addon.services";
import { ITokenData } from "../utility/DataTypes/types.user";
import crypto from "crypto";
import { currentTime, freePlanCode, generateSkip } from "../constants/data";
import querystring from "querystring";
import { payUPaymentProcess } from "../utility/payuProcess";
import { ItemType } from "../../prisma/generated/prisma/client";
import { fetchUserUnique, updateTransactionStatus } from "../utility/prismaQueries";
import {
  paymentInputData,
  RefundResponse,
} from "../utility/DataTypes/types.subscription";
import { getFailurePageurl, refundHost, subscriptionBannerFeatures } from "../constants/subscriptionData";
import {
  calculateTotalConnectionUserCanMake,
  evaluateNewPlanActivationStatus,
  paymentPreProcessing,
} from "../utility/helperFunction/subscription.services.helper";
import https from "https";
import { refundApiCall } from "../utility/payuAPICalls";
import { updateSubscriptionIfExpired } from "../utility/subscription";
import { findPartnerVouchers } from "../utility/helperFunction/voucher.services.helper";
import { adminTokenData } from "../utility/DataTypes/types.admin";

const subscriptionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
  userId: true,
  dependantId: true,
  status: true,
  planVariantId: true,
  planVariants: {
    select: {
      id: true,
      name: true,
      amount: true,
      period: true,
      interval: true,
      isDefault: true,
      plan: {
        select: {
          id: true,
          name: true,
          notes: true,
          planCode: true,
        },
      },
      PlanToFeature: {
        select: {
          feature: {
            select: {
              id: true,
              name: true,
              description: true,
              canonicalName: true,
            },
          },
          metadata: {
            select: {
              id: true,
              value: true,
              remark: true,
            },
          },
        },
      },
    },
  },
};
const validateHash = (responseData: any, receivedHash: any) => {
  const hashString = `${process.env.PAYU_SALT}|${responseData.status}||||||${responseData.udf5 || ""
    }|${responseData.udf4 || ""}|${responseData.udf3 || ""}|${responseData.udf2 || ""
    }|${responseData.udf1 || ""}|${responseData.email}|${responseData.firstname
    }|${responseData.productinfo}|${responseData.amount}|${responseData.txnid
    }|${process.env.PAYU_KEY}`;

  const generatedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  return generatedHash === receivedHash;
};
function generateRefundHash(data: any) {
  // Ensure proper formatting of the input string
  const hashString = `${process.env.PAYU_KEY}|${data.command}|${data.var1}|${process.env.PAYU_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

export const getSubscription = async (params: IGetCommon) => {
  try {
    const { search, page, limit = 10, id, userId } = params;

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const where: any = {};

    if (id) where.id = id;

    if (userId) {
      where.OR = [
        {
          user: {
            id: {
              equals: userId,
              mode: "insensitive",
            },
          },
        },
        {
          dependant: {
            id: {
              equals: userId,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (search)
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          notes: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

    let [activeSubscriptionData, totalRecords, upcomingSubscription] =
      await Promise.all([
        prisma.subscription.findMany({
          where: { ...where, status: "active" },
          select: subscriptionSelect,
          skip,
          take,
          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],
        }),
        prisma.subscription.count({
          where: {
            ...where,
            OR: [{ status: "active" }, { status: "upcoming" }],
          },
        }),
        prisma.subscription.findMany({
          where: { ...where, status: "upcoming" },
          select: subscriptionSelect,
          skip,
          take,
          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],
        }),
      ]);

    if (!activeSubscriptionData || (id && !activeSubscriptionData.length))
      throw new HTTPError("Could not fetch subscription data", 500);

    const activeSubscriptionDataFormatted = activeSubscriptionData.map(
      (subscription) => {
        const { planVariants, ...filteredData } = subscription;
        const { plan, ...filteredPlanVariant } = planVariants;

        return {
          ...filteredData,
          plan: { ...plan, planVariants: { ...filteredPlanVariant } },
        };
      }
    );

    const upcomingSubscriptionFormatted = upcomingSubscription.map(
      (subscription) => {
        const { planVariants, ...filteredData } = subscription;
        const { plan, ...filteredPlanVariant } = planVariants;

        return {
          ...filteredData,
          plan: { ...plan, planVariants: { ...filteredPlanVariant } },
        };
      }
    );

    return {
      success: true,
      data: { activeSubscriptionDataFormatted, upcomingSubscriptionFormatted },
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAllPlanAddons = async (user: ITokenData) => {
  try {
    const planData = await getPlan({}, user);
    const addonData = await getAddon({});
    return {
      success: true,
      data: {
        plan: planData?.data ?? [],
        addon: addonData?.data ?? [],
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const userActiveData = async (params: IGetCommon) => {
  try {
    const activeUpcomimgSub = await getSubscription(params);
    const activeAddon = await getAddon(params);

    if (!activeUpcomimgSub)
      throw new HTTPError("Could not fetch subscription data", 404);

    const hasTransaction = await prisma.transaction.count({
      where: {
        userId: params.userId,
      },
    });
    const partnerVouchers = await findPartnerVouchers();

    return {
      success: true,
      data: {
        activeSubscription:
          activeUpcomimgSub.data.activeSubscriptionDataFormatted[0] ?? {},
        upcomingSubscription:
          activeUpcomimgSub.data.upcomingSubscriptionFormatted[0] ?? {},
        addon: activeAddon?.data ?? [],
        hasTransaction: hasTransaction > 0,
        features: subscriptionBannerFeatures,
        partnerVouchers
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAggregateData = async (admin: adminTokenData) => {
  try {
    let [planData, featureData, voucherData, addonData] = await Promise.all([
      getPlan({ limit: 3 }, admin),
      getFeature({ limit: 3 }),
      getVoucher({ limit: 3 }),
      getAddon({ limit: 3 }),
    ]);

    return {
      success: true,
      data: {
        plans: planData?.data ?? [],
        features: featureData?.data ?? [],
        vouchers: voucherData?.data ?? [],
        addons: addonData?.data ?? [],
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const proceedingToPay = async (
  user: ITokenData,
  data: paymentInputData
) => {
  try {
    const { amount, productinfo, addOn, planVariantId, planId, voucherId, customerGst } =
      data;
    //check if user exists
    const { fetchUser, transactionId } = await prisma.$transaction(
      async (prisma) => {
        if (!planVariantId && addOn?.length === 0) {
          throw new HTTPError("Missing required fields", 400);
        }

        const fetchUser = await prisma.users.findFirst({
          where: {
            id: user.id,
          },
          include: {
            Voucher: true,
            userToAddOn: true,
            Subscription: {
              where: {
                status: "active",
              },
              include: {
                planVariants: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        });

        if (!fetchUser) {
          throw new HTTPError("User not found", 404);
        }

        //preprocessing
        const data = await paymentPreProcessing(
          fetchUser,
          amount,
          planId,
          planVariantId,
          addOn,
          voucherId
        );

        const transactionId = `txn_${Date.now()}`;
        const items = [];



        if (planVariantId && data.findPlanVariant) {
          items.push({
            name: data.findPlanVariant.plan.name,
            planDetails: {
              planPeriod: data.findPlanVariant.period,
              interval: data.findPlanVariant.interval,
            },
            type: "plan" as ItemType,
            amount: data.findPlanVariant.amount,
          });
        }

        if (addOn && data.findAddons && Array.isArray(data.findAddons)) {
          data.findAddons.forEach((addon) => {
            items.push({
              name: addon.name,
              type: "add_on" as ItemType,
              amount: addon.amount,
            });
          });
        }
        const gstRecord = await prisma.profile.findFirst({
          where: {
            id: 1,
          },
          select: {
            gst: true,
          },
        });
        if (!gstRecord) {
          throw new HTTPError("Could not find gst value", 404);
        }
        if (voucherId && data.findVoucher) {
          items.push({
            name: data.findVoucher.name,
            type: "voucher" as ItemType,
            amount: data.findVoucher.amount,
          });
          //add voucher availment to db if partner voucher
          if (voucherId && data.findVoucher.type == "partner")
            await prisma.usersToVoucher.create({
              data: {
                userId: user.id,
                voucherId,
                status: "pending",
              }
            })
        }

        await prisma.transaction.create({
          data: {
            userId: fetchUser.id,
            userFullName: fetchUser.fullName,
            userAddress: fetchUser.address,
            txnid: transactionId,
            totalAmount: parseFloat(parseFloat(data.totalCost).toFixed(2)),
            bankRefNumber: "",
            paymentSource: "",
            paymentStatus: "in progress",
            paymentMode: "",
            currency: "",
            error: "",
            errorMessage: "",
            gst: gstRecord.gst,
            items: items.length > 0 ? { create: items } : undefined,
            mihpayid: "",
            customerGst: customerGst?.toUpperCase() ?? undefined
          },
        });



        return {
          fetchUser,
          transactionId,
        };
      }
    );


    return await payUPaymentProcess(
      fetchUser,
      transactionId,
      amount,
      productinfo,
      planVariantId,
      addOn,
      voucherId
    );
    // }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getExpiryDetails = async (user: ITokenData) => {
  try {
    const userId = user.id;
    const messages: Array<string> = [];

    const { currentSubscription, latestExpiryDate, activeSubscriptionExpiry } =
      await updateSubscriptionIfExpired(userId, messages);
    // Get all non-expired add-ons
    const nonExpiredAddons = await prisma.userToAddOn.findMany({
      where: {
        userId,
        expiresAt: {
          gt: currentTime,
        },
      },
      include: {
        addon: {
          include: {
            feature: true,
          },
        },
      },
    });
    // Calculate connection limits
    const {
      totalAdult,
      totalLinks,
      totalMinor,
      totalSlots,
      connectedAdultCount,
      connectedMinorCount,
    } = await calculateTotalConnectionUserCanMake(
      currentSubscription,
      nonExpiredAddons,
      user
    );

    // Delete expired add-ons

    const expiredAddons = await prisma.userToAddOn.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: currentTime,
        },
      },
    });
    if (expiredAddons.count > 0) {
      messages.push("Some of your add-ons have expired and have been removed.");
    }
    let availableSlots = totalSlots;
    if (totalAdult < connectedAdultCount || totalMinor < connectedMinorCount) {
      const maxLinksAllowed = totalLinks;
      const totalLinkedUsers = connectedAdultCount + connectedMinorCount;
      availableSlots = Math.max(0, maxLinksAllowed - totalLinkedUsers);
    }
    if (
      expiredAddons.count > 0 ||
      ((connectedAdultCount + totalSlots > totalAdult ||
        connectedMinorCount + totalSlots > totalMinor) &&
        availableSlots <= 0)
      // !!currentSubscription.expiresAt &&
      // currentSubscription.expiresAt < currentTime)
    ) {
      const responsePayload = {
        latestExpiryDate,
        isSubscriptionExpired:
          !!activeSubscriptionExpiry && activeSubscriptionExpiry < currentTime,
        isAddonExpired: expiredAddons.count > 0,
        totalAdultUserCanLink: totalAdult,
        totalMinorUserCanLinkWith: totalMinor,
        totalSlots,
        totalLinks: totalLinks,
        totalAdultUserHasLinked: connectedAdultCount,
        totalMinorUserHasLinked: connectedMinorCount,
        availableSlots,
        messages,
      };

      return {
        success: false,

        data: responsePayload,
      };
    }
    return {
      success: true,

      data: { latestExpiryDate },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserSplashLogo = async (user: ITokenData) => {
  try {
    const userId = user.id;

    let logo = null

    //get all "partner" vouchers used by user and active plan of user
    const [getAllUsedVouchers, activePlan] = await Promise.all([
      prisma.usersToVoucher.findFirst({
        where: {
          userId,
          status: "success"
        },
        select: {
          subscriptionId: true,
          voucher: {
            select: {
              clientLogo: true,
              type: true
            }
          },
          subscription: {
            where: {
              status: "active"
            },
            select: {
              userId: true,
              status: true,
              planVariants: {
                select: {
                  id: true,
                  plan: {
                    select: {
                      planCode: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      }),
      getSubscription({ userId })
    ])

    const logoNoShowCondition = getAllUsedVouchers &&
      activePlan.data.activeSubscriptionDataFormatted &&
      (activePlan.data.activeSubscriptionDataFormatted[0].plan.planCode == freePlanCode ||
        activePlan.data.activeSubscriptionDataFormatted[0].plan.planCode != getAllUsedVouchers.subscription?.planVariants.plan.planCode ||
        activePlan.data.activeSubscriptionDataFormatted[0].id !== getAllUsedVouchers.subscriptionId)
    if (logoNoShowCondition) {
      logo = null
    }
    else {
      logo = getAllUsedVouchers?.voucher.clientLogo
    }

    return {
      success: true,
      data: logo
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

// didnt mark transaction as failed as the money has been debited from the user's account hence marked it as sucess yet if some 
// problem has occured from our/payu's side still we can keep track the payment was succeeded but operator was having some 
// issue due to which subscription wasnt linked but money were debited so  admin can also track that 
// transaction is success still the subscription isnt linked so the reason could be hacking (invalid hash ) or some backend issue
// marked status as success but error with reason is saved

export const paymentIsSuccedded = async (responseData: any) => {
  let transactionError: HTTPError | null = null;
  let record: any = null;
  try {
    const findTransaction = await prisma.transaction.findFirst({
      where: {
        txnid: responseData.txnid,
      },
    });
    if (!findTransaction) {
      throw new HTTPError("Transaction not found", 658);
    }
    const updateTrnasaction = await prisma.transaction.update({
      where: {
        txnid: responseData.txnid,
      },
      data: {
        paymentStatus: responseData.status,
        paymentMode: responseData.mode,
        paymentSource: responseData.payment_source,
        bankRefNumber: responseData.bank_ref_num,
        error: responseData.error,
        errorMessage: responseData.error_Message,
        mihpayid: responseData.mihpayid,
      },
    });

    if (!updateTrnasaction) {
      throw new HTTPError("Failed to update transaction", 658);
    }

    const result = await prisma.$transaction(async (prisma) => {
      if (parseFloat(responseData.amount) === 0) {
        console.log("Skipping hash validation for zero payment");
      } else if (!validateHash(responseData, responseData.hash)) {
        throw new HTTPError("Invalid payment hash.", 658);
      }

      const findUser = await prisma.users.findFirst({
        where: {
          id: responseData.udf1,
        },
      });

      const [findPlanVariant, findAddons, findVoucher] = await Promise.all([
        responseData.udf2
          ? prisma.planVariants.findFirst({
            where: {
              id: parseInt(responseData.udf2) ?? null,
              isActive: true,
            },
            include: {
              plan: true,
            },
          })
          : Promise.resolve(null),
        responseData.udf3
          ? prisma.addon.findMany({
            where: {
              id: {
                in: responseData.udf3
                  .split(",")
                  .map((id: any) => parseInt(id)),
              },
              isActive: true,
            },
          })
          : Promise.resolve([]),
        responseData.udf4
          ? prisma.voucher.findFirst({
            where: {
              id: parseInt(responseData.udf4) ?? null,
              isActive: true,
            },
            include: {
              user: {
                where: {
                  id: responseData.udf1,
                },
              },
            },
          })
          : Promise.resolve(null),
      ]);

      if (
        (responseData.udf4 && !findVoucher) ||
        (responseData.udf2 && !findPlanVariant) ||
        (responseData.udf3 &&
          findAddons &&
          responseData.udf3.split(",").length != findAddons.length) ||
        !findUser
      ) {
        //mark transaction as success
        throw new HTTPError("Failed to find the data provided.", 658);
      }

      if (findVoucher && findVoucher.lockedBy === findUser.id) {
        await prisma.voucher.update({
          where: {
            id: parseInt(responseData.udf2),
          },
          data: {
            lockedAt: null,
          },
        });
      }

      if (responseData.udf4 && responseData.udf4 != '') {
        record = await prisma.usersToVoucher.findFirst({
          where: {
            userId: responseData.udf1,
            voucherId: parseInt(responseData.udf4),
            status: "pending"
          }
        })
      }

      //if subscription is expire mark new plan as active else when 3 days are left for expiry mark the new plan as upcoming
      await evaluateNewPlanActivationStatus(
        findPlanVariant,
        findUser,
        findAddons,
        findVoucher,
        record
      );


      return { success: true, userId: responseData.udf1 };
    });


    return result;
  } catch (err) {
    console.log(err, "error");
    transactionError = handleError(err);
    throw transactionError;
  } finally {
    if (transactionError) {
      await prisma.transaction.update({
        where: { txnid: responseData.txnid },
        data: {
          error: transactionError.code.toString(),
          errorMessage: transactionError.message,
        },
      });
    }
  }
};

export const paymentIsFailed = async (responseData: any) => {
  try {
    return await prisma.$transaction(async () => {
      await updateTransactionStatus(responseData.txnid, 658, "Failed");
      return {
        url: getFailurePageurl(responseData.udf1),
        userId: responseData.udf1,
      };
    });
  } catch (err: unknown) {
    throw handleError(err);
  }
};

export const refundInitiator = async (amount: number, txnID: number) => {
  try {
    return await prisma.$transaction(async () => {
      const key = process.env.PAYU_KEY;
      const salt = process.env.PAYU_SALT;

      const findTransaction = await prisma.transaction.findFirst({
        where: { id: txnID },
      });

      if (!findTransaction) {
        throw new HTTPError("Transaction not found", 404);
      }
      if (
        findTransaction.paymentStatus !== "success" ||
        findTransaction.totalAmount === 0
      ) {
        throw new HTTPError(
          "Refund cannot be processed because the payment was not successful or the transaction amount is zero.",
          651
        );
      }
      if (!findTransaction.mihpayid) {
        throw new HTTPError(
          "mihpayid is not available for this transaction,please refresh the page or try again later ",
          652
        );
      }

      const command = "cancel_refund_transaction";

      if (!key || !salt) {
        throw new HTTPError("Missing key and salt value", 422);
      }

      // Generate Hash
      const hash = generateRefundHash({
        key,
        command,
        var1: findTransaction.mihpayid,
        salt,
      });

      // Prepare Data
      const data = querystring.stringify({
        key,
        command,
        var1: findTransaction.mihpayid,
        var2: txnID, // unique number for each refund
        var3: amount, //amount
        var5: "",
        hash,
      });

      //payu api call

      return await refundApiCall(data);
    });
  } catch (err) {
    throw handleError(err);
  }
};

export const getAllRefundsByTransactionId = async (txnId: string) => {
  try {
    await prisma.transaction.findMany({
      where: {
        txnid: txnId,
      },
    });

    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;
    const command = "getAllRefundsFromTxnIds";
    if (!key || !salt) {
      throw new HTTPError("Missing key and salt value", 422);
    }

    // Generate Hash
    const hash = generateRefundHash({ key, command, var1: txnId, salt }); // your internal method
    const data = querystring.stringify({
      key,
      command,
      var1: txnId,
      var2: "payuid",
      hash,
    });

    return new Promise<RefundResponse>((resolve, reject) => {
      const options = {
        hostname: refundHost,
        path: "/merchant/postservice?form=2",
        port: 443,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (payuRes) => {
        const chunks: any[] = [];

        payuRes.on("data", (chunk) => chunks.push(chunk));

        payuRes.on("end", async () => {
          const responseBody = Buffer.concat(chunks).toString();
          const transactionData = JSON.parse(responseBody);
          let refund = [];
          const transactionDetails = transactionData["Refund Details"];
          for (const refundDetails in transactionDetails) {
            refund = transactionDetails[refundDetails];
            break;
          }
          resolve({ success: true, data: refund });
        });
      });

      req.on("error", (error) => {
        console.error("Request Error:", error);
        reject(new HTTPError(`Failed to connect to PayU ${error}`, 500));
      });

      req.write(data);
      req.end();
    });
  } catch (err) {
    throw handleError(err);
  }
};

export const useB2BVoucher = async (user: ITokenData, voucherCode: string) => {
  try {
    let isRedirect = false
    let payload = null
    let message = ""

    //find users current subscription, all availed vouchers, and voucher that was added
    const [fetchUser, findActiveSub, findAvailedVouchers, findVoucher] = await Promise.all([
      fetchUserUnique(user.id),
      userActiveData({ userId: user.id }),
      prisma.usersToVoucher.findMany({
        where: {
          userId: user.id,
          status: "success",
        },
      }),
      prisma.voucher.findFirst({
        where: {
          code: { equals: voucherCode, mode: "insensitive" },
          type: "partner"
        },
        include: {
          user: true
        }
      })
    ]);

    const threeDaysLeft = findActiveSub && findActiveSub.data.activeSubscription.expiresAt && findActiveSub.data.activeSubscription.expiresAt <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const currentPlan = {
      planCode: findActiveSub?.data.activeSubscription.plan?.planCode ?? freePlanCode,
      isDefault: findActiveSub?.data.activeSubscription.plan.planVariants.isDefault
    }
    const upcomingPlan = findActiveSub.data.upcomingSubscription.id ?? null

    //if voucher not found - 404
    //if voucher expired - 400
    //if voucher already availed by user - 400
    //if user is not on free plan or default plan or within 3 days of expiry - 400
    //if user already has an upcoming plan, throw error saying 
    //if user is trying to buy default plan, throw error
    if (!findVoucher) { throw new HTTPError("Could not find entered Partner voucher", 404) }
    if (findVoucher.isActive == false) { throw new HTTPError("Voucher expired or is inactive", 400) }
    if (findAvailedVouchers.find((v) => v.voucherId == findVoucher.id)) { throw new HTTPError("You have already availed this voucher", 400) }
    if (findActiveSub && currentPlan.planCode !== freePlanCode && currentPlan.isDefault !== true && !threeDaysLeft) { throw new HTTPError("You cannot use this voucher on your current plan", 400) }
    if (upcomingPlan) throw new HTTPError("You already have an upcoming plan, you cannot use this voucher", 400)

    //if voucher is valid and user is eligible for voucher
    /**
     * if user is on default / free plan - activate immediately
     * if user is on paid plan with less than 3 days left - put plan in upcoming
     * 
     * if voucher amount == 100
     *  - add plan to user and send congrats message
     * 
     * if voucher amount < 100
     *  - redirect to payment page with proceedToPay api payload
     */

    /**
     * checks to be done - possibly in other apis:
     * - When i redirect to payment, i should be able to use the voucher code in the payment page - proceedToPay api
     */

    const findPlanVariant = findVoucher.planVariantId ? await prisma.planVariants.findFirst({
      where: { id: findVoucher.planVariantId, isActive: true },
      include: { plan: true, PlanToFeature: { include: { feature: true, metadata: true } } }
    }) : null;

    if (!findPlanVariant) throw new HTTPError("No active plan variant attached to this voucher", 404);

    const planPeriod =
      `${findPlanVariant.interval} ${findPlanVariant.period == "monthly" ?
        findPlanVariant.interval === 1 ?
          "Month" : "Months" :
        findPlanVariant.period == "yearly" ?
          findPlanVariant.interval === 1 ?
            "Year" : "Years" :
          findPlanVariant.period == "weekly" ?
            findPlanVariant.interval === 1 ?
              "Week" : "Weeks" :
            "Unlimited"}`

    const planDetails = {
      planName: `${findPlanVariant.plan.name}`,
      planId: findPlanVariant.planId,
      description: findPlanVariant.variantDescription,
      amount: findPlanVariant.amount,
      period: planPeriod,
      discount: findVoucher.amount,
      voucherCode: findVoucher.code,
      // features: findPlanVariant.PlanToFeature.map(
      //   (feature) => `${feature.feature.name} - ${feature.metadata.remark}`
      // )
      features: subscriptionBannerFeatures
    }


    switch (findVoucher.amount) {
      case 100: {
        const record = await prisma.usersToVoucher.create({
          data: {
            userId: user.id,
            voucherId: findVoucher.id,
            status: "success"
          }
        });

        await evaluateNewPlanActivationStatus(
          findPlanVariant,
          fetchUser,
          [],
          findVoucher,
          record
        );

        message = `Congratulations! Your ${findPlanVariant.variantDescription} plan has been successfully activated.`
        break;
      }

      default: {
        isRedirect = true;
        message = `Congratulations! You have unlocked ${findPlanVariant.variantDescription} plan with ${findVoucher.amount}% discount.`

        payload = {
          amount: parseFloat((findPlanVariant.amount - (findPlanVariant.amount * (findVoucher.amount / 100))).toFixed(2)),
          planVariantId: findPlanVariant.id,
          planId: findPlanVariant.planId,
          voucherId: findVoucher.id
        };
        break;
      }
    }

    return {
      success: true,
      message,
      isRedirect,
      payload,
      planDetails
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

