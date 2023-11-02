import { setContext } from '@apollo/client/link/context';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { NgModule } from '@angular/core';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { ConfigService } from './config-service';
import { ConfigModule } from './config.module';

const uri = 'https://api.github.com/graphql';

export function createApollo(httpLink: HttpLink, configService: ConfigService): ApolloClientOptions<any> {
  const config = configService.getConfig();
  const authLink = setContext((request, { headers }) => {
    // Get the token from the ConfigService
    const token = config.githubQuery?.githubToken??'';
    return {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  return {
    link: authLink.concat(httpLink.create({ uri })),
    cache: new InMemoryCache(),
  };
}

@NgModule({
  exports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink, ConfigService], // Include ConfigService in the deps array
    },
  ],
})
export class GraphQLModule {}
