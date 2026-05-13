import path from "path";
import multer from "multer";
import { Request, Response, NextFunction } from "express";

const paths = path.join(__dirname, "../src/uploads");

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, paths);
  },
  filename: function (_req, file, cb) {
    const sanitizedFileName = path
      .basename(file.originalname, path.extname(file.originalname)) // Remove extension
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 50);
    const fileExtension = path.extname(file.originalname) || ".jpg";
    
    cb(null, `${Date.now()}_${sanitizedFileName}${fileExtension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB limit
});



export const uploadMiddleware = (
  fieldName: string | { name: string; maxCount: number }[]
) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    let uploadHandler;

    if (typeof fieldName === "string") {
      uploadHandler = upload.single(fieldName); // Single file upload
    } else if (Array.isArray(fieldName)) {
      uploadHandler = upload.fields(fieldName); // Multiple file upload
    } else {
      return res.status(400).json({ error: "Invalid upload configuration" });
    }

    uploadHandler(_req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res
              .status(413)
              .json({ error: "File size exceeds the 7MB limit" });
          }
          return res
            .status(400)
            .json({ error: `Multer error: ${err.message}` });
        }
        return res.status(500).json({ error: "Internal server error" });
      }
      next();
    });
  };
};
