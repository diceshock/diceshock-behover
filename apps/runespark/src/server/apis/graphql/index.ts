import SchemaBuilder from "@pothos/core";
import { builderSubscription } from "@/server/utils";
import type { GraphQLContext } from "@/shared/types";

const builder = new SchemaBuilder<{ Context: GraphQLContext }>({});

builder.queryType({
  fields: (t) => ({
    hello: t.field({
      type: "String",
      resolve: () => "Hello World",
    }),
    methods: t.field({
      type: ["String"],
      resolve: (_parent, _args, ctx) => Object.keys(ctx),
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    sendMessage: t.field({
      type: "Boolean",
      args: {
        text: t.arg.string({ required: true }),
      },
      resolve: async (_parent, { text }, ctx) => {
        ctx.publish("MESSAGE_TOPIC", { message: text });
        return true;
      },
    }),
    intToJson: t.field({
      type: "String",
      args: {
        data: t.arg.int({ required: true }),
      },
      resolve: async (_parent, { data }) => {
        return JSON.stringify(data);
      },
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    message: t.field({
      type: "String",
      args: {
        text: t.arg.string(),
      },
      subscribe: builderSubscription("MESSAGE_TOPIC", {
        filter: (_root, filterArgs) =>
          filterArgs.text ? { message: filterArgs.text } : {},
      }),
      resolve: (payload: { message: string }) => payload.message,
    }),
  }),
});

export const schema = builder.toSchema();
