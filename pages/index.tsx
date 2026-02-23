import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [inviteCode, setInviteCode] = useState("");

  return (
    <>
      <Head>
        <title>Toplane Duel</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="stylesheet" href="/style.css" />
      </Head>

      <main className="app">
        <header className="topbar">
          <h1>Toplane Duel</h1>
          <div id="statusText">Next.js Routes Enabled</div>
        </header>

        <section className="lobby">
          <Link href="/practice">
            <button>Practice (Create Room)</button>
          </Link>
          <div className="join">
            <input
              maxLength={6}
              value={inviteCode}
              placeholder="Invite code (6 chars)"
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
            <Link href={inviteCode ? `/play/${inviteCode}` : "/"}>
              <button disabled={!inviteCode}>Play by Invite</button>
            </Link>
          </div>
        </section>

        <section className="tips">
          <div className="tips-title">Routes</div>
          <div id="skillTips">/practice : 빠른 생성, /play/[code] : 코드 자동 입장</div>
        </section>
      </main>
    </>
  );
}
