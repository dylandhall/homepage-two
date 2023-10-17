import { gql } from "apollo-angular";

export const prsQuery = gql`{
  repository(name: "app", owner: "MathsPathway") {
    pullRequests(states: OPEN, orderBy: {field: CREATED_AT, direction: ASC}, first: 10) {
      nodes {
        author {
          login
        }
        createdAt
        title
        files {
          totalCount
        }
        url
      }
    }
  }
}`;

export const issuesQuery = gql`{
  repository(name: "app", owner: "MathsPathway") {
    issues(filterBy: {assignee: "dylandhall", states: OPEN}, first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        title
        url
        id
        number
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
      }
    }
  }
}`;
export interface IData {
  repository: IRepository;
}
export interface IRepository {
  issues: IIssues;
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

export interface IBookmarksFile{
  roots: IRoots;
}
export interface IRoots{
  bookmark_bar: IBookmarkBar;
}
export interface IBookmarkBar{
  children: IBookmark[];
}
export interface IBookmark{
  url: string;
  name: string;
  iconUrl: string;
}
