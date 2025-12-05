import { handleSubscriptions } from "graphql-workers-subscriptions";
import { graphqlSubSettings } from "./middlewares/graphql";

const wrapper = (fetch: ExportedHandlerFetchHandler<Cloudflare.Env>) =>
  ({
    fetch: handleSubscriptions({ fetch, ...graphqlSubSettings }),
  }) satisfies ExportedHandler<Cloudflare.Env>;

export default wrapper;
