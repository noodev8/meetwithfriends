--
-- PostgreSQL database dump
--

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.4

-- Started on 2026-01-11 21:42:58

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: meetwithfriends_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO meetwithfriends_user;

--
-- TOC entry 2 (class 3079 OID 23525)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3552 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 244 (class 1255 OID 23677)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: meetwithfriends_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO meetwithfriends_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 23537)
-- Name: app_user; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.app_user (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    bio text,
    avatar_url character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    contact_mobile character varying(50),
    contact_email character varying(255),
    show_mobile_to_guests boolean DEFAULT false,
    show_email_to_guests boolean DEFAULT false,
    last_login_at timestamp with time zone,
    receive_broadcasts boolean DEFAULT true
);


ALTER TABLE public.app_user OWNER TO meetwithfriends_user;

--
-- TOC entry 216 (class 1259 OID 23536)
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.app_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_user_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3553 (class 0 OID 0)
-- Dependencies: 216
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- TOC entry 233 (class 1259 OID 23766)
-- Name: email_log; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.email_log (
    id integer NOT NULL,
    recipient_email character varying(255) NOT NULL,
    email_type character varying(50) NOT NULL,
    subject character varying(255) NOT NULL,
    sent_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'sent'::character varying,
    related_id integer,
    error_message text
);


ALTER TABLE public.email_log OWNER TO meetwithfriends_user;

--
-- TOC entry 232 (class 1259 OID 23765)
-- Name: email_log_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.email_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_log_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 232
-- Name: email_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.email_log_id_seq OWNED BY public.email_log.id;


--
-- TOC entry 229 (class 1259 OID 23657)
-- Name: event_comment; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.event_comment (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_comment OWNER TO meetwithfriends_user;

--
-- TOC entry 228 (class 1259 OID 23656)
-- Name: event_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.event_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_comment_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 228
-- Name: event_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.event_comment_id_seq OWNED BY public.event_comment.id;


--
-- TOC entry 231 (class 1259 OID 23720)
-- Name: event_host; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.event_host (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    added_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_host OWNER TO meetwithfriends_user;

--
-- TOC entry 230 (class 1259 OID 23719)
-- Name: event_host_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.event_host_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_host_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 230
-- Name: event_host_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.event_host_id_seq OWNED BY public.event_host.id;


--
-- TOC entry 225 (class 1259 OID 23607)
-- Name: event_list; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.event_list (
    id integer NOT NULL,
    group_id integer NOT NULL,
    created_by integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    location text,
    date_time timestamp with time zone NOT NULL,
    capacity integer,
    status character varying(20) DEFAULT 'published'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text,
    image_position character varying(10) DEFAULT 'center'::character varying,
    allow_guests boolean DEFAULT false,
    max_guests_per_rsvp integer DEFAULT 1,
    menu_link text,
    preorder_cutoff timestamp without time zone,
    preorders_enabled boolean DEFAULT false,
    CONSTRAINT event_image_position_check CHECK (((image_position)::text = ANY ((ARRAY['top'::character varying, 'center'::character varying, 'bottom'::character varying])::text[]))),
    CONSTRAINT event_max_guests_check CHECK (((max_guests_per_rsvp >= 1) AND (max_guests_per_rsvp <= 5))),
    CONSTRAINT event_status_check CHECK (((status)::text = ANY ((ARRAY['published'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.event_list OWNER TO meetwithfriends_user;

--
-- TOC entry 224 (class 1259 OID 23606)
-- Name: event_list_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.event_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_list_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 224
-- Name: event_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.event_list_id_seq OWNED BY public.event_list.id;


--
-- TOC entry 227 (class 1259 OID 23632)
-- Name: event_rsvp; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.event_rsvp (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) DEFAULT 'attending'::character varying NOT NULL,
    waitlist_position integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    guest_count integer DEFAULT 0,
    food_order text,
    dietary_notes text,
    CONSTRAINT event_rsvp_guest_count_check CHECK (((guest_count >= 0) AND (guest_count <= 5))),
    CONSTRAINT event_rsvp_status_check CHECK (((status)::text = ANY ((ARRAY['attending'::character varying, 'waitlist'::character varying, 'not_going'::character varying])::text[])))
);


ALTER TABLE public.event_rsvp OWNER TO meetwithfriends_user;

--
-- TOC entry 226 (class 1259 OID 23631)
-- Name: event_rsvp_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.event_rsvp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_rsvp_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 226
-- Name: event_rsvp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.event_rsvp_id_seq OWNED BY public.event_rsvp.id;


--
-- TOC entry 221 (class 1259 OID 23567)
-- Name: group_list; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.group_list (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    image_url character varying(500),
    join_policy character varying(20) DEFAULT 'approval'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    visibility character varying(10) DEFAULT 'listed'::character varying,
    image_position character varying(10) DEFAULT 'center'::character varying,
    invite_code character varying(12) NOT NULL,
    CONSTRAINT group_image_position_check CHECK (((image_position)::text = ANY ((ARRAY['top'::character varying, 'center'::character varying, 'bottom'::character varying])::text[]))),
    CONSTRAINT user_group_join_policy_check CHECK (((join_policy)::text = ANY ((ARRAY['auto'::character varying, 'approval'::character varying])::text[])))
);


ALTER TABLE public.group_list OWNER TO meetwithfriends_user;

--
-- TOC entry 220 (class 1259 OID 23566)
-- Name: group_list_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.group_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_list_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 220
-- Name: group_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.group_list_id_seq OWNED BY public.group_list.id;


--
-- TOC entry 223 (class 1259 OID 23580)
-- Name: group_member; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.group_member (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_visited_at timestamp with time zone,
    CONSTRAINT group_member_role_check CHECK (((role)::text = ANY ((ARRAY['organiser'::character varying, 'host'::character varying, 'member'::character varying])::text[]))),
    CONSTRAINT group_member_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'pending'::character varying])::text[])))
);


ALTER TABLE public.group_member OWNER TO meetwithfriends_user;

--
-- TOC entry 222 (class 1259 OID 23579)
-- Name: group_member_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.group_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_member_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3560 (class 0 OID 0)
-- Dependencies: 222
-- Name: group_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.group_member_id_seq OWNED BY public.group_member.id;


--
-- TOC entry 219 (class 1259 OID 23551)
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: meetwithfriends_user
--

CREATE TABLE public.password_reset_token (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_token OWNER TO meetwithfriends_user;

--
-- TOC entry 218 (class 1259 OID 23550)
-- Name: password_reset_token_id_seq; Type: SEQUENCE; Schema: public; Owner: meetwithfriends_user
--

CREATE SEQUENCE public.password_reset_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_token_id_seq OWNER TO meetwithfriends_user;

--
-- TOC entry 3561 (class 0 OID 0)
-- Dependencies: 218
-- Name: password_reset_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: meetwithfriends_user
--

ALTER SEQUENCE public.password_reset_token_id_seq OWNED BY public.password_reset_token.id;


--
-- TOC entry 3303 (class 2604 OID 23540)
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- TOC entry 3337 (class 2604 OID 23769)
-- Name: email_log id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.email_log ALTER COLUMN id SET DEFAULT nextval('public.email_log_id_seq'::regclass);


--
-- TOC entry 3333 (class 2604 OID 23660)
-- Name: event_comment id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_comment ALTER COLUMN id SET DEFAULT nextval('public.event_comment_id_seq'::regclass);


--
-- TOC entry 3335 (class 2604 OID 23723)
-- Name: event_host id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host ALTER COLUMN id SET DEFAULT nextval('public.event_host_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 23610)
-- Name: event_list id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_list ALTER COLUMN id SET DEFAULT nextval('public.event_list_id_seq'::regclass);


--
-- TOC entry 3329 (class 2604 OID 23635)
-- Name: event_rsvp id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_rsvp ALTER COLUMN id SET DEFAULT nextval('public.event_rsvp_id_seq'::regclass);


--
-- TOC entry 3311 (class 2604 OID 23570)
-- Name: group_list id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_list ALTER COLUMN id SET DEFAULT nextval('public.group_list_id_seq'::regclass);


--
-- TOC entry 3317 (class 2604 OID 23583)
-- Name: group_member id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_member ALTER COLUMN id SET DEFAULT nextval('public.group_member_id_seq'::regclass);


--
-- TOC entry 3309 (class 2604 OID 23554)
-- Name: password_reset_token id; Type: DEFAULT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.password_reset_token ALTER COLUMN id SET DEFAULT nextval('public.password_reset_token_id_seq'::regclass);


--
-- TOC entry 3350 (class 2606 OID 23548)
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- TOC entry 3352 (class 2606 OID 23546)
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3387 (class 2606 OID 23775)
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3380 (class 2606 OID 23665)
-- Name: event_comment event_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_comment
    ADD CONSTRAINT event_comment_pkey PRIMARY KEY (id);


--
-- TOC entry 3383 (class 2606 OID 23728)
-- Name: event_host event_host_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- TOC entry 3385 (class 2606 OID 23726)
-- Name: event_host event_host_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_pkey PRIMARY KEY (id);


--
-- TOC entry 3369 (class 2606 OID 23618)
-- Name: event_list event_list_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_list
    ADD CONSTRAINT event_list_pkey PRIMARY KEY (id);


--
-- TOC entry 3373 (class 2606 OID 23642)
-- Name: event_rsvp event_rsvp_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_rsvp
    ADD CONSTRAINT event_rsvp_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- TOC entry 3375 (class 2606 OID 23640)
-- Name: event_rsvp event_rsvp_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_rsvp
    ADD CONSTRAINT event_rsvp_pkey PRIMARY KEY (id);


--
-- TOC entry 3360 (class 2606 OID 23578)
-- Name: group_list group_list_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_list
    ADD CONSTRAINT group_list_pkey PRIMARY KEY (id);


--
-- TOC entry 3362 (class 2606 OID 23592)
-- Name: group_member group_member_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_member
    ADD CONSTRAINT group_member_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- TOC entry 3364 (class 2606 OID 23590)
-- Name: group_member group_member_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_member
    ADD CONSTRAINT group_member_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 2606 OID 23557)
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 23559)
-- Name: password_reset_token password_reset_token_token_key; Type: CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_key UNIQUE (token);


--
-- TOC entry 3353 (class 1259 OID 23549)
-- Name: idx_app_user_email; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_app_user_email ON public.app_user USING btree (email);


--
-- TOC entry 3388 (class 1259 OID 23776)
-- Name: idx_email_log_sent_at; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_email_log_sent_at ON public.email_log USING btree (sent_at);


--
-- TOC entry 3381 (class 1259 OID 23676)
-- Name: idx_event_comment_event_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_comment_event_id ON public.event_comment USING btree (event_id, created_at);


--
-- TOC entry 3370 (class 1259 OID 23629)
-- Name: idx_event_list_group_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_list_group_id ON public.event_list USING btree (group_id);


--
-- TOC entry 3371 (class 1259 OID 23630)
-- Name: idx_event_list_upcoming; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_list_upcoming ON public.event_list USING btree (group_id, date_time) WHERE ((status)::text = 'published'::text);


--
-- TOC entry 3376 (class 1259 OID 23653)
-- Name: idx_event_rsvp_event_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_rsvp_event_id ON public.event_rsvp USING btree (event_id);


--
-- TOC entry 3377 (class 1259 OID 23654)
-- Name: idx_event_rsvp_user_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_rsvp_user_id ON public.event_rsvp USING btree (user_id);


--
-- TOC entry 3378 (class 1259 OID 23655)
-- Name: idx_event_rsvp_waitlist; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_event_rsvp_waitlist ON public.event_rsvp USING btree (event_id, waitlist_position) WHERE ((status)::text = 'waitlist'::text);


--
-- TOC entry 3365 (class 1259 OID 23603)
-- Name: idx_group_member_group_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_group_member_group_id ON public.group_member USING btree (group_id);


--
-- TOC entry 3366 (class 1259 OID 23605)
-- Name: idx_group_member_pending; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_group_member_pending ON public.group_member USING btree (group_id, status) WHERE ((status)::text = 'pending'::text);


--
-- TOC entry 3367 (class 1259 OID 23604)
-- Name: idx_group_member_user_id; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_group_member_user_id ON public.group_member USING btree (user_id);


--
-- TOC entry 3354 (class 1259 OID 23565)
-- Name: idx_password_reset_token_token; Type: INDEX; Schema: public; Owner: meetwithfriends_user
--

CREATE INDEX idx_password_reset_token_token ON public.password_reset_token USING btree (token);


--
-- TOC entry 3401 (class 2620 OID 23678)
-- Name: app_user update_app_user_updated_at; Type: TRIGGER; Schema: public; Owner: meetwithfriends_user
--

CREATE TRIGGER update_app_user_updated_at BEFORE UPDATE ON public.app_user FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3403 (class 2620 OID 23680)
-- Name: event_list update_event_list_updated_at; Type: TRIGGER; Schema: public; Owner: meetwithfriends_user
--

CREATE TRIGGER update_event_list_updated_at BEFORE UPDATE ON public.event_list FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3402 (class 2620 OID 23679)
-- Name: group_list update_group_list_updated_at; Type: TRIGGER; Schema: public; Owner: meetwithfriends_user
--

CREATE TRIGGER update_group_list_updated_at BEFORE UPDATE ON public.group_list FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3396 (class 2606 OID 23666)
-- Name: event_comment event_comment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_comment
    ADD CONSTRAINT event_comment_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event_list(id) ON DELETE CASCADE;


--
-- TOC entry 3397 (class 2606 OID 23671)
-- Name: event_comment event_comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_comment
    ADD CONSTRAINT event_comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 3392 (class 2606 OID 23748)
-- Name: event_list event_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_list
    ADD CONSTRAINT event_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id) ON DELETE SET NULL;


--
-- TOC entry 3393 (class 2606 OID 23619)
-- Name: event_list event_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_list
    ADD CONSTRAINT event_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_list(id) ON DELETE CASCADE;


--
-- TOC entry 3398 (class 2606 OID 23753)
-- Name: event_host event_host_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.app_user(id) ON DELETE SET NULL;


--
-- TOC entry 3399 (class 2606 OID 23729)
-- Name: event_host event_host_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event_list(id) ON DELETE CASCADE;


--
-- TOC entry 3400 (class 2606 OID 23734)
-- Name: event_host event_host_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 3394 (class 2606 OID 23643)
-- Name: event_rsvp event_rsvp_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_rsvp
    ADD CONSTRAINT event_rsvp_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event_list(id) ON DELETE CASCADE;


--
-- TOC entry 3395 (class 2606 OID 23648)
-- Name: event_rsvp event_rsvp_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.event_rsvp
    ADD CONSTRAINT event_rsvp_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 3390 (class 2606 OID 23593)
-- Name: group_member group_member_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_member
    ADD CONSTRAINT group_member_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_list(id) ON DELETE CASCADE;


--
-- TOC entry 3391 (class 2606 OID 23598)
-- Name: group_member group_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.group_member
    ADD CONSTRAINT group_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 3389 (class 2606 OID 23560)
-- Name: password_reset_token password_reset_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: meetwithfriends_user
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 2091 (class 826 OID 23512)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO meetwithfriends_user;


--
-- TOC entry 2090 (class 826 OID 23511)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO meetwithfriends_user;


-- Completed on 2026-01-11 21:43:00

--
-- PostgreSQL database dump complete
--

