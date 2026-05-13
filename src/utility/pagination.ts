type PageResults = {
  //   pg_ents: [number, number][]; //not really needed
  skipMinor: number;
  skipPrimary: number;
  currentPageRecords: [number, number];
};

export function pg_arrs(
  primaryCount: number,
  minorCount: number,
  page: number,
  pageSize = 50,
  recordsPerUserType = 25,
  
): PageResults {
  const pg_ents: [number, number][] = [];

  let skipMinor = 0;
  let skipPrimary = 0;
  let rem_primary = primaryCount;
  let rem_minor = minorCount;

  for (let pg = 1; pg <= page; pg++) {
    let t_a1 = Math.min(recordsPerUserType, rem_primary);
    let t_a2 = Math.min(recordsPerUserType, rem_minor);

    let ttl_tkn = t_a1 + t_a2;

    // If total tokens are less than page size, add extras from arrays in order
    if (ttl_tkn < pageSize) {
      let xtra_a1 = 0;
      let xtra_a2 = 0;

      if (rem_primary > t_a1) {
        xtra_a1 = Math.min(pageSize - ttl_tkn, rem_primary - t_a1);
        t_a1 += xtra_a1;
        ttl_tkn += xtra_a1;
      }

      if (ttl_tkn < pageSize && rem_minor > t_a2) {
        xtra_a2 = Math.min(pageSize - ttl_tkn, rem_minor - t_a2);
        t_a2 += xtra_a2;
        ttl_tkn += xtra_a2;
      }
    }

    // Update remaining records for each array
    rem_primary -= t_a1;
    rem_minor -= t_a2;

    // Append the result for the current page
    pg_ents.push([t_a1, t_a2]);

    // Track skip values for the next pages if needed
    if (pg < page) {
      skipMinor += t_a1;
      skipPrimary += t_a2;
    }
  }

  return {
    // pg_ents,
    skipMinor,
    skipPrimary,
    currentPageRecords: pg_ents[pg_ents.length - 1],
    // rem_primary,
    // rem_minor,
    // rem_a3,
  };
}


