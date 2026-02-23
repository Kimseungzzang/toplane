import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import ToplaneApp from "../../src/components/toplane/ToplaneApp";

export default function PlayByCodePage() {
  const router = useRouter();
  const rawCode = useMemo(
    () => String(router.query?.code || "").trim().toUpperCase().slice(0, 6),
    [router.query?.code]
  );
  const validCode = /^[A-HJ-NP-Z2-9]{6}$/.test(rawCode);

  useEffect(() => {
    if (!router.isReady) return;
    if (validCode) return;
    router.replace("/");
  }, [router, validCode]);

  if (!router.isReady || !validCode) return null;

  return (
    <>
      <Head>
        <title>Play {rawCode} | Toplane Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <ToplaneApp autoJoinCode={rawCode} hideCreateButton />
    </>
  );
}
