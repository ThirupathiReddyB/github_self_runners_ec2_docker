import z from "zod";

export const createPayment = z
  .object({
    amount: z.number().nonnegative(),
    productInfo: z.string().optional().default(""),
    voucherId: z.number().positive().optional(),
    planId: z.number().positive().optional(),
    addOn: z.array(z.number()).optional(),
    planVariantId: z.number().nonnegative().optional(),
    customerGst: z.string().trim()
      .refine((gstNo) => {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(gstNo);
      }, "Invalid. Please Enter Correct GST Number").optional(),
  })
  .refine((data) => {
    if (
      (data.planId && !data.planVariantId) ||
      (data.planVariantId && !data.planId) ||
      (!data.planId && !data.planVariantId && !data.addOn)
    ) {
      return false;
      
    }
    return true;
  },{
    message: "Either both planId and planVariantId must be provided together, or at least one addOn must be specified.",
    path :["planVariantId","planId","addOn"]
  });

export const createRefund = z.object({
  amount: z.number().positive(),
  txnId: z.number().positive(),
});
