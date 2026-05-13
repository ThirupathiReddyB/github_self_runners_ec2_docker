import { AdvertiseType } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";
import {
  ICreateVoucher,
  IGetUserVoucher,
} from "../utility/DataTypes/types.voucher";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import { generateSkip } from "../constants/data";
import { emailingService } from "../utility/emailService";
import { partner_voucher } from "../templateDesign/DashboardTemplates";
import { unlinkFile } from "../utility/Helpers";
import {
  deleteOldLinks,
  duplicateVoucherCode,
  existingLinkedAdv,
  findVoucher,
  handlePartnerVoucher,
} from "../utility/helperFunction/voucher.services.helper";

export const voucherCommonSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  type: true,
  amount: true,
  expiresAt: true,
  voucherBanner: true,
  clientLogo: true,
  redeemLimit: true,
  partnerEmail: true,
  minSpend: true,
  isActive: true,
  availedCount: true,
  advertisementType: true,
  advertisement: true,
  planVariant: {
    include: {
      plan: true
    }
  }
};

export const createUpdateVoucher = async (
  admin: adminTokenData,
  params: ICreateVoucher
) => {
  try {
    const {
      id,
      voucherName,
      voucherCode,
      voucherType,
      voucherDescription,
      voucherAmount,
      expiry,
      redeemLimit,
      voucherIsActive,
      minSpend,
      partnerEmail,
      linkAdvertisement,
      voucherBanner,
      linkedPlanId,
    } = params;

    // fetch existing voucher
    const voucherData = await findVoucher(id);

    const linkToDefault = await prisma.planVariants.findFirst({
      where: {
        id: linkedPlanId,
        isDefault: true,
        Voucher: {
          some: {
            id: id
          }
        }
      }
    })
    if (linkToDefault) throw new HTTPError("You Cannot link partner voucher to default plan(Qaurterly 3 Months Plan). Please choose another plan to link", 400)

    //pre-processing
    await Promise.all([
      duplicateVoucherCode(voucherCode, id),
      existingLinkedAdv(linkAdvertisement, id),
    ]);
    let { dbAdvLink, bannerImage, logoImage, renamedLogoData, renamedBannerData, advertisementType } =
      await handlePartnerVoucher(admin, params);

    //delete old adv links if voucher is changed from partner ->generic
    await deleteOldLinks(voucherData, voucherType);

    //upsert voucher data
    const updateVoucherData = await prisma.voucher.upsert({
      where: id ? { id } : { code: voucherCode },
      update: {
        name: voucherName,
        code: voucherCode,
        amount: voucherAmount,
        type: voucherType,
        description: voucherDescription,
        expiresAt: expiry,
        minSpend,
        redeemLimit,
        partnerEmail,
        isActive: voucherIsActive,
        advertisement: dbAdvLink,
        updatedBy: admin.emailId,
        advertisementType,
        voucherBanner: bannerImage,
        clientLogo: logoImage,
        planVariantId: linkedPlanId
      },
      create: {
        name: voucherName,
        code: voucherCode,
        amount: voucherAmount,
        type: voucherType,
        description: voucherDescription,
        expiresAt: expiry,
        redeemLimit,
        minSpend,
        availedCount: 0,
        isActive: Boolean(voucherIsActive),
        partnerEmail,
        advertisement: dbAdvLink,
        updatedBy: admin.emailId,
        advertisementType,
        voucherBanner: bannerImage,
        clientLogo: logoImage,
        planVariantId: linkedPlanId
      },
      select: voucherCommonSelect,
    });

    if (!updateVoucherData)
      throw new HTTPError("Could not add/update voucher", 500);

    //email partner about his/her voucher
    if (partnerEmail && voucherType === "partner") {
      const response = await emailingService({
        email_id: partnerEmail,
        template: partner_voucher,
        data: {
          voucherCode: updateVoucherData.code,
          voucherAmount: updateVoucherData.amount,
          description: updateVoucherData.description,
          expiry: updateVoucherData.expiresAt ? `${updateVoucherData.expiresAt.getDate()}/${updateVoucherData.expiresAt.getMonth()}/${updateVoucherData.expiresAt.getFullYear()}` : "",
          redeemLimit: updateVoucherData.redeemLimit,
          imagePath: renamedBannerData ? renamedBannerData.path : voucherData?.voucherBanner,
          originalFilename: voucherBanner?.originalname
        },
        subject: "THITO Partner Voucher",
        choice: "partner_voucher",
      });
      if (!response)
        throw new HTTPError("Could not send email to partner", 400);

      if (renamedLogoData) await unlinkFile(renamedLogoData.path);
      if (renamedBannerData) await unlinkFile(renamedBannerData.path);
    }

    return {
      success: true,
      voucher: updateVoucherData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const removeVoucher = async (id: number) => {
  try {
    const existingVoucher = await prisma.voucher.findUnique({
      select: voucherCommonSelect,
      where: {
        id,
      },
    });

    if (!existingVoucher) throw new HTTPError("Voucher Not found", 404);

    // remove entry from db
    const deleteVoucherData = await prisma.voucher.delete({
      where: {
        id,
      },
    });
    if (!deleteVoucherData)
      throw new HTTPError("Could not delete voucher", 500);

    return {
      success: true,
      message: "Voucher deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getVoucher = async (params: IGetUserVoucher) => {
  try {
    const { search, page, limit = 10, id, userId, voucherCode } = params;

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;
    // const type = voucherCode ? ["generic", "partner"] : ["generic"];
    const type = ["generic"];

    if (userId && voucherCode) {
      const findVoucher = await prisma.voucher.findFirst({
        where: {
          code: voucherCode,
          isActive: true,
          type: "partner"
        }
      })
      if (findVoucher) {
        throw new HTTPError("Cannot avail partner vouchers here", 400)
      }
    }

    const where: any = {};
    if (userId) {
      where.NOT = {
        user: {
          some: {
            id: userId,
          },
        },
      };

      where.isActive = true;
      where.type = { in: type };
      where.code = voucherCode;
      if (!voucherCode) {
        where.OR = [{ expiresAt: { gt: new Date() } }, { expiresAt: null }];
      }
    }

    if (id) where.id = id;
    if (search && search != '')
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
        search in AdvertiseType
          ? {
            type: {
              equals: search,
            },
          }
          : {},
      ];

    const [voucherData] = await Promise.all([
      prisma.voucher.findMany({
        where,
        select: voucherCommonSelect,
        skip,
        take,
        orderBy: [
          { amount: "desc" },
          {
            updatedAt: "desc",
          },
          {
            id: "desc",
          },
        ],
      }),
    ]);
    if (!voucherData || (id && !voucherData.length))
      throw new HTTPError("Could not fetch voucher data", 404);

    const filteredVouchers = voucherData.filter((voucher) => {
      return voucher.redeemLimit && !voucherCode
        ? voucher.availedCount < voucher.redeemLimit
        : true;
    });

    let isExpired: boolean = false;
    let isAvailed: boolean = false;
    //check if voucher is expired and isnt availed only when he is entering the coupon
    const finalVouchers = userId
      ? voucherCode
        ? filteredVouchers.map((voucher) => {
          isExpired = voucher.expiresAt
            ? new Date(voucher.expiresAt) < new Date()
            : false;
          isAvailed =
            voucher.redeemLimit && voucher.availedCount
              ? voucher.availedCount >= voucher.redeemLimit
              : false;
          return { ...voucher, isExpired, isAvailed };
        })
        : filteredVouchers
      : voucherData;

    return {
      success: true,

      data: finalVouchers,

      totalRecords: finalVouchers.length,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
