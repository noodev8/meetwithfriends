'use client';

/*
=======================================================================================================================================
Group Invite Page
=======================================================================================================================================
Landing page for group magic invite links (/invite/g/:token).
Thin wrapper around InviteFlow.
=======================================================================================================================================
*/

import { useParams } from 'next/navigation';
import InviteFlow from '@/components/invite/InviteFlow';

export default function GroupInvitePage() {
    const params = useParams();
    const token = params.token as string;

    return <InviteFlow token={token} type="group" />;
}
