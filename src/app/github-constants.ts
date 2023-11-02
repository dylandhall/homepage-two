import {
  gql,
  TypedDocumentNode
} from "apollo-angular";
import { IRepository } from './github-types';

export function getCustomisedQueries(owner:string, repo:string, username:string): TypedDocumentNode<IRepository, unknown> {
  return gql`{
    repository(name: "${repo}", owner: "${owner}") {
      assignedTo: issues(filterBy: {assignee: "${username}", states: OPEN}, first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
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
      labeledEpic: issues(filterBy: {states: OPEN, labels: "epic"}, first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
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
      },
      pullRequests: pullRequests(states: OPEN, orderBy: {field: CREATED_AT, direction: ASC}, first: 10) {
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
}
