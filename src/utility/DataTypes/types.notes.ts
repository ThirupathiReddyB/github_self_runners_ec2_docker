export interface ICreateNotes {
  color: string;
  description: string;
  title: string;
  famCareMemberId?: string;
  userId:string
}

export interface IGetNotes {
  userId: string;
  id?: number;
  famCareMemberId?: string;
}

export interface IUpdateNotes {
  notesId: number;
  color?: string;
  description?: string;
  title?: string;
  famCareMemberId?: string;
}

export interface IDeleteNotes {
  id?: string;
  famCareMemberId?: string;
}
