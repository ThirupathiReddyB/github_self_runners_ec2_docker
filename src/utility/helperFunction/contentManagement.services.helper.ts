import { AdvertisePosition, Users } from "../../../prisma/generated/prisma/client";
import HTTPError from "../HttpError";
import prisma from "../../prisma";
import {
  IGetFacility,
  IGetVideo,
  TVideoWithRelations,
} from "../DataTypes/types.contentManagement";
import axios from "axios";
import { IGetCommon } from "../DataTypes/types.common";

const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY ?? "";

export const buildSearchFilter = async (
  search: string | undefined,
  entity: "video" | "advertisement" | "facility" | "story" | "blog"
) => {
  if (!search) return [];

  const searchFilters: Array<{}> = [];

  const searchFields = {
    video: [
      { title: { contains: search, mode: "insensitive" } },
      { vidSourceUrl: { contains: search, mode: "insensitive" } },
    ],
    advertisement: [{ advName: { contains: search, mode: "insensitive" } }],
    facility: [
      { facPrimaryName: { contains: search, mode: "insensitive" } },
      { facSecondaryName: { contains: search, mode: "insensitive" } },
      { facPhoneNumber: { contains: search, mode: "insensitive" } },
      { facAddress: { contains: search, mode: "insensitive" } },
      { facPincode: { contains: search, mode: "insensitive" } },
      { facType: { contains: search, mode: "insensitive" } },
    ],
    story: [
      { title: { contains: search, mode: "insensitive" } },
      {
        storyImage: {
          some: {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
    blog: [
      { title: { contains: search, mode: "insensitive" } },
      { author: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ],
  };

  if (entity == "video" || entity === "story" || entity === "blog") {
    const searchTags = search.includes(",") ? search.split(",") : [search];
    searchFilters.push({
      tags: {
        some: {
          name: {
            in: searchTags,
          },
        },
      },
    });
  } else if (entity === "facility") {
    const searchTerms = search.split(",").map((s) => s.trim().toLowerCase());
    const facilities = await prisma.facility.findMany({
      select: {
        facSpeciality: true,
      },
      distinct: ['facSpeciality'],
    });
    const specs = [...new Set(facilities.flatMap(f => f.facSpeciality))];
    const matchedSpecialities = specs.filter((spec) =>
      searchTerms.some((term) => spec.toLowerCase().includes(term))
    );
    searchFilters.push({
      facSpeciality: { hasSome: matchedSpecialities },
    });
  }

  if (
    (search as AdvertisePosition) == "bottom" ||
    (search as AdvertisePosition) == "top"
  ) {
    searchFilters.push({
      advPosition: search as AdvertisePosition,
    });
  }

  return [...searchFilters, ...searchFields[entity]];
};

export const buildVideoFilter = (
  queryParams: IGetVideo,
  isAdmin: boolean,
  isAvailable?: boolean
) => {
  const { id, sortByField, sortByOrder, vidType, type } = queryParams;
  const filters: any = {};
  filters.vidType = vidType;
  if (vidType !== "reel" && type != "all") {
    filters.vidType = {
      in: ["video", "default_video"],
    };
  }
  if (isAdmin) {
    if (id) {
      filters.id = id; // conversion parsedqs-> string ->int
    }
  } else {
    if (id) {
      filters.id = parseInt(id as string); // conversion parsedqs-> string ->int
    }
    filters.isActive = true;
    if (isAvailable) {
      filters.OR = [
        {
          isSubscribed: true,
        },
        {
          isSubscribed: false,
        },
      ];
    } else {
      filters.isSubscribed = false;
    }
  }
  const sortByFilters: { [key: string]: any } = {};
  if (sortByField && sortByOrder) {
    sortByFilters[sortByField] = sortByOrder;
  }
  return { filters, sortByFilters };
};

//--getAllFacilities
export const getAllAdminFacilities = async (
  filters: any,
  searchFilter: Array<{}>,
  queryParams: IGetCommon
) => {
  const { page, limit } = queryParams;
  let getAllFacilities;
  getAllFacilities = await prisma.facility.findMany({
    where: {
      ...filters,
      ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
    },
    skip: page ? (page - 1) * (limit ?? 500) : 0,
    take: limit ?? 500,
  });

  if (!getAllFacilities)
    throw new HTTPError("Could not fetch facilities from database", 404);

  return getAllFacilities;
};

export const getAllUserFacilities = async (
  searchFilter: Array<{}>,
  queryParams: IGetFacility,
  findUser: Users
) => {
  const { page, limit, type } = queryParams;
  const typeFilter: any = {};
  if (type) {
    typeFilter.facType = type; // Ensure the correct property name is used
  }
  // Fetch facilities that match the user's pincode
  const [facilitiesMatchingPincode, totalRecords] = await Promise.all([
    prisma.facility.findMany({
      where: {
        isActive: true,
        ...(typeFilter.facType ? { facType: typeFilter.facType } : {}),
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
      skip: page && limit ? (page - 1) * limit : 0,
      take: limit ?? undefined,
    }),
    prisma.facility.count({
      where: {
        isActive: true,
        ...(typeFilter.facType ? { facType: typeFilter.facType } : {}),
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    }),
  ]);

  facilitiesMatchingPincode.sort((a, b) => {
    const aMatches = a.facPincode === findUser.pincode;
    const bMatches = b.facPincode === findUser.pincode;

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;

    return 0;
  });
  return { facilitiesMatchingPincode, totalRecords };
};

//--getAllVideos
export const getAllAdminVideos = async (
  filters: any,
  searchFilter: Array<{}>,
  sortByFilters: {
    [key: string]: any;
  },
  queryParams: IGetVideo
) => {
  const { page, limit = 10 } = queryParams;
  let getAllVideos;
  getAllVideos = await prisma.video.findMany({
    where: {
      ...filters,
      ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
    },
    orderBy: [{ ...sortByFilters }, { id: "asc" }],

    skip: !page ? 0 : (page - 1) * limit,
    take: limit ?? undefined,
    include: {
      tags: true,
    },
  });

  if (!getAllVideos)
    throw new HTTPError("Could not fetch videos from database", 500);
  return getAllVideos;
};

export const finalAdminResultGetAllVideos = async (
  filters: any,
  searchFilter: Array<{}>,
  getAllVideos: TVideoWithRelations[],
  skip: number
) => {
  const totalRecords = await prisma.video.count({
    where: {
      ...filters,
      ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
    },
  });
  let formattedData = getAllVideos.map((vid, index) => {
    const { tags, ...filteredData } = vid;
    return {
      serialNumber: index + 1 + skip,
      ...filteredData,
      tags: tags?.map((tag) => tag.name),
    };
  });

  return { totalRecords, formattedData };
};

//--getAllAdvertisements
export const getAllAdminAdvertisements = async (
  filters: any,
  searchFilter: Array<{}>,
  queryParams: IGetCommon
) => {
  const { page, limit, filter } = queryParams;
  if (filter && filter == "for_voucher") {
    filters.VoucherId = null
  }

  let getAllAdvertisements;
  getAllAdvertisements = await prisma.advertisement.findMany({
    where: {
      ...filters,
      ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
    },

    orderBy: [{ priority: "asc" }, { id: "asc" }],
    skip: page && limit ? (page - 1) * limit : 0,
    take: limit ?? 500,
  });
  if (!getAllAdvertisements)
    throw new HTTPError("Could not fetch advertisements from database", 500);
  return getAllAdvertisements;
};

export const getCoordinatesFromAddress = async (
  address: string,
  pincode: string
) => {
  // console.log("ADDRESS:::", address);
  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address,
        key: GEOCODING_API_KEY,
        region: "in",
      },
    }
  );
  // console.log("DATA::", data);

  const filteredData = data.results.filter(
    (res: any) => res.geometry.location_type !== "APPROXIMATE"
  );
  // console.log("filteredData::", filteredData);

  if (!filteredData.length)
    throw new HTTPError("Unable to geocode address", 422);

  const result = filteredData[0];
  // console.log("result::", result);
  // console.log("address compenet::", result.address_components);

  // Extracts postal code first and validates it before proceeding
  const returnedZip = result.address_components.find((comp: any) =>
    comp.types.includes("postal_code")
  )?.long_name;

  // if (returnedZip !== pincode) {
  //   throw new HTTPError(
  //     `Pincode mismatch: Expected ${returnedZip}, got ${pincode}`,
  //     400
  //   );
  // }
  if (returnedZip !== pincode) {
    console.error(`Pincode mismatch: Expected ${returnedZip}, got ${pincode}`);
  }

  // Extracts location details only if pincode validation passes
  const { lat, lng } = result.geometry.location;

  return { lat, lng };
};

//-- Check if a feature is available based on metadata
export function isFeatureAvailable(metadataValue: any): boolean {
  if (
    typeof metadataValue === "object" &&
    metadataValue !== null &&
    "available" in metadataValue
  ) {
    return metadataValue.available === true;
  }
  return false;
}
