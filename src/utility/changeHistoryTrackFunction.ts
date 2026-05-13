import { Changes } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import dotenv from "dotenv";
import HTTPError from "./HttpError";
dotenv.config();

export const trackChanges = async (
  userChanged: string,
  changeType: Changes,
  recordId: number | string,
  tableId: string,
  changedBy: string,
  minorDataIsChangedBySecondaryParent: boolean
) => {
  //1. flag user sync for user whose data is changed (if another member is changing data)
  if (userChanged != changedBy && !minorDataIsChangedBySecondaryParent) {
    await prisma.users.update({
      where: {
        id: userChanged,
      },
      data: {
        isSync: false,
        inAppNotificationSync: false,
      },
    });
  }

  //2. Find all family members who can see "userchanged" data
  const family = await prisma.familylinks.findMany({
    where: {
      ...(userChanged == changedBy
        ? {
            linkTo: userChanged,
          }
        : {
            linkTo: userChanged,

            ...(minorDataIsChangedBySecondaryParent
              ? { NOT: { linkFrom: changedBy } }
              : {
                  NOT: [{ linkFrom: changedBy }, { linkType: "sharedMinor" }], // if secondary user data is changed minor -> scndry user link should not be marked as false
                }),
          }),
    },
  });
  //3. flag all family links between member -> userChanged
  await prisma.familylinks.updateMany({
    where: {
      ...(userChanged == changedBy
        ? {
            linkTo: userChanged,
          }
        : {
            linkTo: userChanged,

            ...(minorDataIsChangedBySecondaryParent
              ? { NOT: { linkFrom: changedBy } }
              : {
                  NOT: [{ linkFrom: changedBy }, { linkType: "sharedMinor" }],
                }),
          }),
    },
    data: {
      synced: false,
    },
  });

  //4. add changes under all family members who can see "userchanged" data
  let changesRecord = [];
  if (family.length == 0 && userChanged != changedBy) {
    changesRecord.push(
      await prisma.syncChanges.create({
        data: {
          userChanged: userChanged,
          changeType: changeType,
          familyMember: userChanged,
          recordId: recordId.toString(),
          table: tableId,
          changedBy: changedBy, //logged In user
        },
      })
    );
  } else {
    const addRecordForSelf =
      userChanged != changedBy && !minorDataIsChangedBySecondaryParent;

    addRecordForSelf &&
      changesRecord.push(
        await prisma.syncChanges.create({
          data: {
            userChanged: userChanged,
            changeType: changeType,
            familyMember: userChanged,
            recordId: recordId.toString(),
            table: tableId,
            changedBy: changedBy, //logged In user
          },
        })
      );
    changesRecord.push(
      Promise.all(
        family.map(async (member) => {
          const res = await prisma.syncChanges.create({
            data: {
              userChanged: userChanged,
              changeType: changeType,
              familyMember: member.linkFrom,
              recordId: recordId.toString(),
              table: tableId,
              changedBy: changedBy, //logged In user
            },
          });
          if (!res) {
            throw new HTTPError("Could not track change", 500);
          }
          const findUser = await prisma.users.findFirst({
            where: {
              id: member.linkFrom,
            },
          });
          if (findUser) {
            const notifSync = await prisma.users.update({
              where: {
                id: member.linkFrom,
              },
              data: {
                inAppNotificationSync: false,
              },
            });
            if (!notifSync) {
              throw new HTTPError("Could not track change", 500);
            }
          }
        })
      )
    );
  }

  if (!changesRecord)
    throw new HTTPError("Could not record changes for family members", 500);

  return {
    success: true,
    changes: changesRecord,
  };
};

export const trackActiveSession = async (uuid: string) => {
  const trackedChanges = await prisma.activeUsers.upsert({
    where: {
      id: uuid,
    },
    update: {
      user: {
        connect: {
          id: uuid,
        },
      },
      timeStamp: new Date(Date.now()),
    },
    create: {
      user: {
        connect: {
          id: uuid,
        },
      },
      timeStamp: new Date(Date.now()),
    },
  });
  if (!trackedChanges) {
    throw new HTTPError("Could not track active session", 500);
  }
  return true;
};
