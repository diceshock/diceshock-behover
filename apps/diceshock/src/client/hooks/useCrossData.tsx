import { atom, useAtomValue } from "jotai";
import React, { createContext, useContext, useMemo } from "react";
import LZString from "lz-string";
import { Context } from "hono";
import { HonoCtxEnv, InjectCrossData, injectCrossDataZ } from "@/shared/types";
import useHydrateOptionalAtom from "./useHydrateOptionalAtoms";

const INJECTION_OBJ = "__SYFT_SERVER_CTX_DATA__";
const ServerDataA = atom<InjectCrossData | null>(null);

const CrossContext = createContext<InjectCrossData | null>(null);

export const CrossDataProvider: React.FC<{
    c: Context<HonoCtxEnv>;
    children: React.ReactNode;
}> = ({ c, children }) => {
    const data = c.get("InjectCrossData") ?? {};
    const payload = LZString.compressToBase64(JSON.stringify(data));

    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: `window.${INJECTION_OBJ} = "${payload}"`,
                }}
            />
            <CrossContext.Provider value={data}>
                {children}
            </CrossContext.Provider>
        </>
    );
};

export const useCrossDataRegister = () => {
    const raw = (globalThis as any)[INJECTION_OBJ];

    let decoded: InjectCrossData | null = null;
    try {
        const json = LZString.decompressFromBase64(raw);
        if (json) decoded = injectCrossDataZ.parse(JSON.parse(json));
    } catch (e) {
        console.error("Error decoding server data", e);
    }

    const parsedMeta = injectCrossDataZ.safeParse(decoded);

    useHydrateOptionalAtom(ServerDataA, parsedMeta.data, parsedMeta.success);
};

const useCrossData = () => {
    const serverDataFromAtom = useAtomValue(ServerDataA);
    const serverDataFromContext = useContext(CrossContext);

    return useMemo(
        () => serverDataFromAtom ?? serverDataFromContext,
        [serverDataFromAtom, serverDataFromContext]
    );
};

export default useCrossData;
