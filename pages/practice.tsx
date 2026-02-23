import Head from "next/head";
import ToplaneApp from "../src/components/toplane/ToplaneApp";

export default function PracticePage() {
  return (
    <>
      <Head>
        <title>Practice | Toplane Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <ToplaneApp autoCreate />
    </>
  );
}
