import { makeExecutableSchema } from "@graphql-tools/schema";
import type { IResolvers } from "@graphql-tools/utils";
import type { createDefaultPublishableContext } from "graphql-workers-subscriptions";
import { subscribe } from "graphql-workers-subscriptions";

export const typeDefs = `
  type Query {
    hello: String!
  }

  type Mutation {
    sendMessage(text: String!): Boolean!
  }

  type Subscription {
    message(text: String): String!
  }
`;

// 定义 GraphQL context 类型
type GraphQLContext = ReturnType<
  typeof createDefaultPublishableContext<Cloudflare.Env>
>;

export const schema = makeExecutableSchema<GraphQLContext>({
  typeDefs,
  resolvers: {
    Query: {
      hello: (_, _i, ctx) => JSON.stringify(Object.keys(ctx)),
    },

    Mutation: {
      sendMessage: async (_, { text }, ctx) => {
        ctx.publish("MESSAGE_TOPIC", { message: text });
        return true;
      },
    },

    Subscription: {
      message: {
        subscribe: subscribe("MESSAGE_TOPIC", {
          filter: (_root, args) => (args.text ? { message: args.text } : {}),
        }),
      },
    },
  },
});
