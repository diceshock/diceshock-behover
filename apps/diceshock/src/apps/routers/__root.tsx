import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { phoneBindingPromptAtom } from "@/client/atoms/phoneBindingPrompt";
import PhoneBindingPrompt from "@/client/components/PhoneBindingPrompt";
import { GraphQLProvider } from "@/client/graphql/provider";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { useI18nDataRegister } from "@/client/hooks/useI18nData";
import { MessagesContainer } from "@/client/hooks/useMessages";
import { StoreProvider } from "@/client/hooks/useStoreContext";
import { I18nProvider } from "@/client/providers/I18nProvider";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useI18nDataRegister();
  useCrossDataRegister();
  useAuthRegister();

  const [phonePrompt, setPhonePrompt] = useAtom(phoneBindingPromptAtom);

  return (
    <GraphQLProvider>
      <StoreProvider>
        <I18nProvider>
          <Outlet />
          <Scripts />
          <MessagesContainer />
          <PhoneBindingPrompt
            isOpen={phonePrompt.open}
            onClose={() => setPhonePrompt({ open: false })}
          />
        </I18nProvider>
      </StoreProvider>
    </GraphQLProvider>
  );
}
