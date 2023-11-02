
export interface IData {
  repository: IRepository;
}
export interface IRepository {
  assignedTo: IIssues;
  labeledEpic: IIssues;
  pullRequests: IPrs;
}
export interface IIssues{
  nodes: GitIssue[];
}

export interface GitLabel {
  color: string;
  name: string;
}
export interface IPrs {
  nodes: IGitPr[];
}
export interface IGitPr {
  title: string;
  url: string;
  projectStatus: string;
  files: IFilesCount;
  author: IAuthor;
}
export interface IAuthor{
  login: string;
}
export interface IFilesCount{
  totalCount: number;
}
export interface GitIssue {
  title: string;
  url: string;
  id: string;
  number: number;
  projectStatus: string;
  labels: ILabels;
}

export interface ILabels{
  nodes: GitLabel[];
}

export interface ICard {
  url: string;
  name: string;
  iconUrl: string;
}
