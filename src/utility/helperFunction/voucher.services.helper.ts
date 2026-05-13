// import { AdvertiseType } from "../../../prisma/generated/prisma/client";
import { adminTokenData } from "../DataTypes/types.admin";
// import { IUploadAdvertisementData } from "../DataTypes/types.contentManagement";
import { ICreateVoucher, IGetVoucherData } from "../DataTypes/types.voucher";
import HTTPError from "../HttpError";
// import { createNewAdvertisement } from "../../services/contentManagement.services";
import { awsBucketLink } from "../../constants/data";
import { deleteFile } from "../aws/deleteFile";
import { renameFile } from "../renameFiles";
import { uploadGenImage } from "../aws/uploadFile";
import prisma from "../../prisma";

export const findVoucher = async (id?: number) => {
  const voucherData = id
    ? await prisma.voucher.findUnique({
      select: {
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
        planVariantId: true,
        planVariant: true
      },
      where: {
        id,
      },
    })
    : null;

  if (id && !voucherData) throw new HTTPError("Voucher Not Found", 404);
  return voucherData;
};

export const duplicateVoucherCode = async (code: string, id?: number) => {
  const existingVoucher = await prisma.voucher.findFirst({
    where: {
      code: {
        equals: code,
        mode: "insensitive",
      },
      NOT: id
        ? {
          id,
        }
        : undefined,
    },
  });

  if (existingVoucher)
    throw new HTTPError("Voucher with same code already exists", 400);
};

export const existingLinkedAdv = async (
  linkAdvertisement?: string[],
  id?: number
) => {
  console.log(id)
  // const existingLinkedAdv = linkAdvertisement
  //   ? await prisma.advertisement.findMany({
  //     where: {
  //       id: {
  //         in: linkAdvertisement?.map((id) => parseInt(id)),
  //       },
  //       ...(id ? {
  //         AND: [
  //           {
  //             NOT: {
  //               VoucherId: id
  //             }
  //           },
  //           {
  //             NOT: {
  //               VoucherId: null
  //             }
  //           }
  //         ]

  //       } : {
  //         VoucherId: null
  //       })
  //     },
  //   })
  //   : undefined;

  // if (existingLinkedAdv && existingLinkedAdv.length > 0) {
  //   let advNames = "";
  //   existingLinkedAdv.flatMap(
  //     (adv) => (advNames = advNames + adv.advName + ",")
  //   );
  //   throw new HTTPError(
  //     `${advNames} - are already linked to another voucher. Please select another advertisement`,
  //     422
  //   );
  // }
  const existingLinkedAdv = linkAdvertisement?.length
    ? await prisma.advertisement.findMany({
      where: {
        id: { in: linkAdvertisement.map((id) => parseInt(id)) },
        // If updating (id exists), find ads linked to OTHER vouchers.
        // If creating (no id), find ads already linked to ANY voucher.
        NOT: {
          VoucherId: id ? id : null,
        },
      },
    })
    : undefined;

  if (existingLinkedAdv && existingLinkedAdv.length > 0) {
    const advNames = existingLinkedAdv.map(adv => adv.advName).join(", ");

    throw new HTTPError(
      `${advNames} - already linked to another voucher. Please select different advertisements.`,
      422
    );
  }
};

export const handlePartnerVoucher = async (
  admin: adminTokenData,
  params: ICreateVoucher,
) => {
  const {
    id,
    voucherType,
    linkAdvertisement,
    // file,
    voucherBanner,
    advName,
    // advPosition,
    // priority,
    // advRedirectLink,
    // advStart,
    // advEnd,
    // advTime,
    clientLogo
  } = params;

  if (voucherType !== "partner") return {};

  console.log(admin.role)

  const voucherData: IGetVoucherData | null = await findVoucher(id);

  let dbAdvLink;
  let newAdvData;
  let bannerImage = voucherData?.voucherBanner ?? '';
  let logoImage = voucherData?.clientLogo ?? '';

  let voucherImage = null
  let renamedFiledata: any
  let renamedLogoData: any;
  let renamedBannerData: any;
  let advertisementType = voucherData?.advertisementType ?? "";

  // const isNewAdv =
  //   advName && advPosition && file && advStart && advEnd && advTime;

  // //if new adv is incoming(in case of edit), delete the previous links to adv
  // if (id && isNewAdv) {
  //   await disconnectOldAdvertisements(voucherData);
  // }

  // //if new advertisement, create adv and store ID to link to voucher
  // if (isNewAdv) {
  //   const inputData: IUploadAdvertisementData = {
  //     file,
  //     advName,
  //     advType: "promotion" as AdvertiseType,
  //     advPosition: advPosition,
  //     isActive: "true",
  //     isSubscribed: "true",
  //     advRedirectLink,
  //     priority: priority ?? "1",
  //     advStart: advStart.toDateString() ?? null,
  //     advEnd: advEnd.toDateString() ?? null,
  //     advTimeLimit: advTime,
  //   };
  //   newAdvData = await createNewAdvertisement(admin, inputData);
  // }

  //setting link data(for DB changes)
  dbAdvLink = await handleLinkedAdvertisements({
    linkAdvertisement,
    voucherData,
    newAdvData,
  });

  if (clientLogo) {
    //handle voucher banner
    ({ voucherImage, renamedFiledata } = await handleVoucherImage(
      voucherData,
      clientLogo
    ));
    renamedLogoData = renamedFiledata
    logoImage = voucherImage
  }

  if (voucherBanner) {
    //handle voucher banner
    ({ voucherImage, renamedFiledata } = await handleVoucherImage(
      voucherData,
      voucherBanner
    ));
    bannerImage = voucherImage
    renamedBannerData = renamedFiledata
  }

  if (linkAdvertisement?.length) {
    advertisementType = "linked";
  } else if (advName) {
    advertisementType = "new";
  }

  return {
    newAdvData,
    dbAdvLink,
    bannerImage,
    logoImage,
    renamedLogoData,
    renamedBannerData,
    advertisementType,
  };
};

// 🔽 Helper Functions

// async function disconnectOldAdvertisements(
//   voucherData: IGetVoucherData | null
// ) {
//   const deleteOld = await prisma.advertisement.updateMany({
//     where: {
//       id: { in: voucherData?.advertisement.flatMap((adv) => adv.id) },
//     },
//     data: {
//       advType: "feature",
//       VoucherId: null,
//     },
//   });
//   if (!deleteOld) {
//     throw new HTTPError(
//       "Could not disconnect previously linked advertisements",
//       500
//     );
//   }
// }

async function handleLinkedAdvertisements({
  linkAdvertisement,
  voucherData,
  newAdvData,
}: {
  linkAdvertisement?: string[];
  voucherData: IGetVoucherData | null;
  newAdvData: any;
}) {
  if (linkAdvertisement && linkAdvertisement.length) {

    if (voucherData && voucherData.advertisement.length) {
      await prisma.advertisement.updateMany({
        where: {
          id: { in: voucherData?.advertisement.flatMap((adv) => adv.id) },
        },
        data: {
          advType: "feature",
          VoucherId: null,
        },
      });
    }

    await prisma.advertisement.updateMany({
      where: {
        id: { in: linkAdvertisement.map((id) => parseInt(id)) },
      },
      data: {
        advType: "promotion",
        isSubscribed: true
      },
    });

    return {
      connect: linkAdvertisement.map((id) => ({
        id: parseInt(id),
      })),
    };
  } else if (newAdvData) {
    return {
      connect: {
        id: newAdvData.uploadDocumentResponse.id,
      },
    };
  }
  return undefined;
}

async function handleVoucherImage(voucherData: any, voucherBanner: any) {
  let voucherImage = "";
  let renamedFiledata: any;

  if (voucherData?.voucherBanner) {
    //delete existing image (if any)
    const imageName = voucherData.voucherBanner.split(`${awsBucketLink}/`)[1];
    const [folderName, fileName] = imageName.split("/");
    const result = await deleteFile(fileName, folderName);
    if (!result) throw new HTTPError("Could not delete file from s3", 502);
  }

  renamedFiledata = renameFile(
    voucherBanner,
    `${Date.now()}_${voucherBanner.originalname}`
  );

  const uploadResult = await uploadGenImage(renamedFiledata, "voucher");
  if (!uploadResult) throw new HTTPError("Could not upload to s3", 502);

  voucherImage = `${awsBucketLink}/${uploadResult.Key}`;

  return { voucherImage, renamedFiledata };
}

export const deleteOldLinks = async (
  voucherData: IGetVoucherData | null,
  voucherType: string
) => {
  if (
    voucherData &&
    voucherType != "partner" &&
    voucherData.type == "partner"
  ) {
    //unlink all advertisements
    const deleteOldAdvLinks = await prisma.advertisement.updateMany({
      where: {
        id: {
          in: voucherData.advertisement.flatMap((adv) => adv.id),
        },
      },
      data: {
        advType: "promotion",
        VoucherId: null,
        isSubscribed: true,
      },
    });
    if (!deleteOldAdvLinks)
      throw new HTTPError(
        "Could not disconnect previously linked advertisements",
        500
      );

    // delete plan linking
    const deletePlanLinking = await prisma.voucher.update({
      where: {
        id: voucherData.id
      },
      data: {
        planVariantId: null,
        advertisementType: ""
      }
    })
    if (!deletePlanLinking)
      throw new HTTPError(
        "Could not disconnect previously linked plan",
        500
      );
  }
};

export const updateExpiredVouchers = async () => {
  // 1. Mark Expired
  await prisma.voucher.updateMany({
    where: {
      expiresAt: { lt: new Date() }
    },
    data: { isActive: false }
  });

  // 2. Mark Limit Reached 
  // This requires a loop or raw query because Prisma doesn't support "column A >= column B" in filters.
  const limitReachedVouchers = await prisma.voucher.findMany({
    where: {
      isActive: true,
      redeemLimit: { not: null },
    },
    select: { id: true, availedCount: true, redeemLimit: true }
  });
  if (limitReachedVouchers.length > 0) {
    const idsToDisable = limitReachedVouchers
      .filter(v => v.availedCount >= (v.redeemLimit ?? 0))
      .map(v => v.id);

    if (idsToDisable.length > 0) {
      await prisma.voucher.updateMany({
        where: { id: { in: idsToDisable } },
        data: { isActive: false }
      });
    }
  }
}

export const findPartnerVouchers = async () => {
  const partnerVouchers = await prisma.voucher.findMany({
    where: {
      type: "partner",
      isActive: true,
    },
    include: {
      planVariant: {
        include: {
          plan: true
        }
      }
    }
  })
  if (partnerVouchers.length > 0) {
    return partnerVouchers.map((voucher) => {
      return {
        id: voucher.id,
        voucherCode: voucher.code,
        voucherName: voucher.name,
        clientLogo: voucher.clientLogo,
        voucherExpiry: voucher.expiresAt,
        planName: voucher.planVariant?.plan.name,
        planDescription: voucher.planVariant?.variantDescription,
        planVariantId: voucher.planVariantId
      }
    })
  }
  else return []
}
