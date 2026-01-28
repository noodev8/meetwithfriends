'use client';

/*
=======================================================================================================================================
Event Invite Page
=======================================================================================================================================
Landing page for event magic invite links (/invite/e/:token).
Thin wrapper around InviteFlow.
=======================================================================================================================================
*/

import { useParams } from 'next/navigation';
import InviteFlow from '@/components/invite/InviteFlow';

export default function EventInvitePage() {
    const params = useParams();
    const token = params.token as string;

    return <InviteFlow token={token} type="event" />;
}
