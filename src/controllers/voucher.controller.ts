import { Request, Response } from "express";
import { Helpers } from "../utility/Helpers";
import HTTPError from "../utility/HttpError";
import {
  createUpdateVoucher,
  getVoucher,
  removeVoucher,
} from "../services/voucher.services";
import { ICreateVoucher } from "../utility/DataTypes/types.voucher";
import { GroupedFiles, IGetCommon } from "../utility/DataTypes/types.common";
import {
  VCreateVoucher,
  VUpdateVoucher,
} from "../utility/Validation/voucher.validation";

export const createVoucher = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const files = req.files as GroupedFiles;

    const file = files.imageFile ? files.imageFile[0] : undefined;
    const voucherBanner = files.voucherBanner
      ? files.voucherBanner[0]
      : undefined;
    const clientLogo = files.clientLogo ? files.clientLogo[0]
      : undefined;

    const {
      voucherName,
      voucherCode,
      voucherAmount,
      minSpend,
      voucherIsActive,
      voucherDescription,
      voucherType,
      expiry,
      redeemLimit,
      partnerEmail,
      advName,
      advPosition,
      priority,
      advRedirectLink,
      advStart,
      advEnd,
      advTime,
      linkAdvertisement,
      linkedPlanId
    } = req.body;

    const params: ICreateVoucher = {
      voucherName,
      voucherCode: voucherCode.toUpperCase(),
      voucherType,
      voucherDescription,
      voucherAmount: parseFloat(voucherAmount),
      expiry: expiry ? new Date(expiry) : undefined,
      redeemLimit: redeemLimit ? parseInt(redeemLimit) : undefined,
      voucherIsActive: voucherIsActive == "true",
      minSpend: minSpend ? parseInt(minSpend) : 0,
      partnerEmail,
      file,
      voucherBanner,
      clientLogo,
      advName,
      advPosition,
      priority,
      advRedirectLink,
      advStart: advStart ? new Date(advStart) : undefined,
      advEnd: advEnd ? new Date(advEnd) : undefined,
      advTime,
      linkAdvertisement,
      linkedPlanId: linkedPlanId ? parseInt(linkedPlanId) : undefined
    };

    Helpers.validateWithZod(VCreateVoucher, params);
    // console.log(process.cwd())
    const newVoucher = await createUpdateVoucher(admin, params);

    if (!newVoucher) throw new HTTPError(`Could Not Create New Voucher`, 204);
    const code = newVoucher.success ? 200 : 400;
    res.status(code).json({ data: newVoucher });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getVouchers = async (req: Request, res: Response) => {
  try {
    const { id, search, page, limit } = req.query;

    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      id: id ? parseInt(id as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const voucherData = await getVoucher(queryFields);
    if (!voucherData) throw new HTTPError(`Could Not get voucher data`, 204);
    const code = voucherData.success ? 200 : 400;
    res.status(code).json({ data: voucherData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateVoucherById = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const id = req.params.id;

    if (!id) throw new HTTPError("provide id of voucher to update", 422);

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const files = req.files as GroupedFiles;

    const file = files.imageFile ? files.imageFile[0] : undefined;
    const voucherBanner = files.voucherBanner ? files.voucherBanner[0] : undefined;
    const clientLogo = files.clientLogo ? files.clientLogo[0] : undefined;

    const {
      voucherName,
      voucherCode,
      voucherType,
      voucherDescription,
      voucherAmount,
      expiry,
      redeemLimit,
      minSpend,
      voucherIsActive,
      partnerEmail,
      advName,
      advPosition,
      priority,
      advRedirectLink,
      advStart,
      advEnd,
      advTime,
      linkAdvertisement,
      linkedPlanId
    } = req.body;

    const params: ICreateVoucher = {
      id: parseInt(id),
      voucherName,
      voucherCode: voucherCode.toUpperCase(),
      voucherType,
      voucherDescription,
      voucherAmount: parseFloat(voucherAmount),
      expiry: expiry ? new Date(expiry) : undefined,
      redeemLimit: redeemLimit ? parseInt(redeemLimit) : undefined,
      voucherIsActive: voucherIsActive && voucherIsActive == "true",
      minSpend: minSpend ? parseInt(minSpend) : undefined,
      partnerEmail,
      file,
      advName,
      advPosition,
      priority,
      voucherBanner,
      clientLogo,
      advRedirectLink,
      advStart: advStart ? new Date(advStart) : undefined,
      advEnd: advEnd ? new Date(advEnd) : undefined,
      advTime,
      linkAdvertisement,
      linkedPlanId: linkedPlanId ? parseInt(linkedPlanId) : undefined
    };

    Helpers.validateWithZod(VUpdateVoucher, params);

    const updateVoucherData = await createUpdateVoucher(admin, params);
    if (!updateVoucherData)
      throw new HTTPError(`Could Not Update Voucher`, 204);
    const code = updateVoucherData.success ? 200 : 400;
    res.status(code).json({ data: updateVoucherData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteVoucherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) throw new HTTPError("provide id of voucher to update", 422);

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const delVoucherData = await removeVoucher(parseInt(id));
    if (!delVoucherData) throw new HTTPError(`Could Not delete Voucher`, 204);
    const code = delVoucherData.success ? 200 : 400;
    res.status(code).json({ data: delVoucherData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

// //Version 2
// export const createVoucherV2 = async (req: Request, res: Response) => {
//   try {
//     if (!Object.keys(req.body).length) {
//       throw new HTTPError("API Missing body", 422);
//     }

//     const admin = req.admin;
//     if (!admin || admin.role !== "superAdmin") {
//       throw new HTTPError("Unauthorized", 401);
//     }

//     const files = req.files as GroupedFiles;

//     const file = files.imageFile ? files.imageFile[0] : undefined;
//     const voucherBanner = files.voucherBanner ?? undefined;
//     const clientLogo = files.clientLogo ? files.clientLogo[0]
//       : undefined;

//     const {
//       voucherName,
//       voucherCode,
//       voucherAmount,
//       minSpend,
//       voucherIsActive,
//       voucherDescription,
//       voucherType,
//       expiry,
//       redeemLimit,
//       partnerEmail,
//       advName,
//       advPosition,
//       priority,
//       advRedirectLink,
//       advStart,
//       advEnd,
//       advTime,
//       linkAdvertisement,
//     } = req.body;

//     const params: ICreateVoucher = {
//       voucherName,
//       voucherCode: voucherCode.toUpperCase(),
//       voucherType,
//       voucherDescription,
//       voucherAmount: parseFloat(voucherAmount),
//       expiry: expiry ? new Date(expiry) : undefined,
//       redeemLimit: redeemLimit ? parseInt(redeemLimit) : undefined,
//       voucherIsActive: voucherIsActive == "true",
//       minSpend: minSpend ? parseInt(minSpend) : 0,
//       partnerEmail,
//       file,
//       voucherBanner,
//       clientLogo,
//       advName,
//       advPosition,
//       priority,
//       advRedirectLink,
//       advStart: advStart ? new Date(advStart) : undefined,
//       advEnd: advEnd ? new Date(advEnd) : undefined,
//       advTime,
//       linkAdvertisement,
//     };

//     Helpers.validateWithZod(VCreateVoucher, params);
//     // console.log(process.cwd())
//     const newVoucher = await createUpdateVoucher(admin, params);

//     if (!newVoucher) throw new HTTPError(`Could Not Create New Voucher`, 204);
//     const code = newVoucher.success ? 200 : 400;
//     res.status(code).json({ data: newVoucher });
//   } catch (err) {
//     if (err instanceof HTTPError) {
//       res.status(err.code).json({ error: { message: err.message } });
//     } else {
//       res.status(500).json({ error: { message: "Internal server error" } });
//     }
//   }
// };

