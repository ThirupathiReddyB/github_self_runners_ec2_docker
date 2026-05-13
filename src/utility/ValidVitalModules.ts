import prisma from "../prisma";


export const getValidModules = async (user: any, searchFilter: Array<{}>) => {
  try {
    const modules = await prisma.vitalModule.findMany({
      where: {
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    });
    return modules.filter((module) => {
      return module.filters.every((filter: any) => {
        if (!Array.isArray(module.filters) || module.filters.length === 0) {
          // If filters is null, undefined, or not an array, treat it as no filters and include the module
          return true;
        }
        if (filter.key == "age") {
          const age =
            new Date(Date.now()).getFullYear() - user.dob.getFullYear();
          return age >= parseInt(filter.value);
        }
        if (filter.key == "gender") {
          return user[filter.key] == filter.value;
        }
        return user[filter.key] == filter.value;
      });
    });
  } catch (error) {
    console.error(error);
  }
};
