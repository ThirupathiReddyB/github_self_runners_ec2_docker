import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  createNotesValidation,
  updateNotesValidation,
} from "../utility/Validation/notesValidation";
import {
  createUserNotes,
  deleteNote,
  getUserNotes,
  editNotes,
} from "../services/notes.services";
import { Helpers } from "../utility/Helpers";
import {
  ICreateNotes,
  IDeleteNotes,
  IGetNotes,
  IUpdateNotes,
} from "../utility/DataTypes/types.notes";

//create notes
export const createNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = req.user.id;

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { famCareMemberId } = req.query;

    const { color, description, title } = req.body;
    if (!color || !description || !title) {
      throw new HTTPError("Missing required fields", 422);
    }
    const data: ICreateNotes = {
      color,
      description,
      title,
      famCareMemberId:
        typeof famCareMemberId === "string" ? famCareMemberId : undefined,
      userId,
    };

    Helpers.validateWithZod(createNotesValidation, data);

    const createdNotes = await createUserNotes(data);
    if (!createdNotes) {
      throw new HTTPError("could not create notes", 204);
    }
    const code = createdNotes.success ? 200 : 400;
    res.status(code).json({ data: createdNotes });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//read all notes
export const getAllNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = req.user.id;

    const { id, famCareMemberId } = req.query;

    const queryParams: IGetNotes = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      famCareMemberId: famCareMemberId ? String(famCareMemberId) : undefined,
      userId,
    };

    const readAllNotes = await getUserNotes(queryParams);
    if (!readAllNotes) {
      throw new HTTPError("could not create notes", 204);
    }
    const code = readAllNotes.success ? 200 : 400;
    res.status(code).json({ data: readAllNotes });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//update notes
export const updateNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = req.user.id;
    const notesId = parseInt(req.params.id);
    if (!notesId) throw new HTTPError("notesId is required", 422);
    const { famCareMemberId } = req.query;

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { color, description, title } = req.body;
    const data: IUpdateNotes = {
      notesId,
      color,
      description,
      title,
      famCareMemberId: famCareMemberId ? String(famCareMemberId) : undefined,
    };

    Helpers.validateWithZod(updateNotesValidation, data);

    const updatedNotes = await editNotes(userId, data);
    if (!updatedNotes) {
      throw new HTTPError("could not create notes", 204);
    }
    const code = updatedNotes.success ? 200 : 400;
    res.status(code).json({ data: updatedNotes });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//delete notes
export const deleteNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = req.user.id;

    const { id, famCareMemberId } = req.query;
    if (!id) {
      throw new HTTPError("provide the id of the note to be deleted", 422);
    }
    const queryParams: IDeleteNotes = {
      id: typeof id === "string" ? id : undefined,
      famCareMemberId:
        typeof famCareMemberId === "string" ? famCareMemberId : undefined,
    };

    const deletedNotes = await deleteNote(queryParams, userId);
    if (!deletedNotes) {
      throw new HTTPError(" could not delete record", 204);
    }
    const code = deletedNotes.success ? 200 : 400;
    res.status(code).json({ data: deletedNotes });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//
