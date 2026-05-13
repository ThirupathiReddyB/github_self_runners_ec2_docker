export const filterRecords = async (
  successRecords: number[],
  allRecords: number[]
) => {
  try {
    const successSet = new Set(successRecords);
    const failed = allRecords.filter((rec) => !successSet.has(rec));

    return failed; // Ensure to return the failed array if needed
  } catch (error) {
    console.error(error); // Log the error for debugging
    throw error; // Optionally rethrow the error to handle it outside
  }
};
