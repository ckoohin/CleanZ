import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0.1 — BASELINE SCHEMA (production). Toàn bộ schema hiện tại sinh từ pg_dump DB dev
 * (đã loại bảng migrations + sequence + meta psql). Chạy đầu tiên trên DB rỗng.
 */
export class BaselineSchema1782000000000 implements MigrationInterface {
  name = 'BaselineSchema1782000000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path TO public;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: ban_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ban_type AS ENUM (
    'TEMPORARY',
    'PERMANENT'
);


--
-- Name: blog_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.blog_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'POSTED',
    'CONFIRMED',
    'TASKER_ON_THE_WAY',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: cancelled_by; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cancelled_by AS ENUM (
    'CUSTOMER',
    'TASKER',
    'SYSTEM',
    'ADMIN'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'NEED_INFO'
);


--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'CITIZEN_ID',
    'OTHER'
);


--
-- Name: incident_closure_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_closure_reason AS ENUM (
    'COMPENSATED',
    'REJECTED',
    'WITHDRAWN',
    'DUPLICATE',
    'INVALID_BOOKING',
    'EXPIRED'
);


--
-- Name: incident_compensation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_compensation_status AS ENUM (
    'NONE',
    'PENDING',
    'PROCESSING',
    'RECORDED',
    'FAILED'
);


--
-- Name: incident_damage_item_verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_damage_item_verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'NEED_MORE_EVIDENCE'
);


--
-- Name: incident_decision_response_review_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_decision_response_review_result AS ENUM (
    'KEEP_DECISION',
    'REVISE_DECISION'
);


--
-- Name: incident_decision_response_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_decision_response_type AS ENUM (
    'AGREE',
    'DISAGREE'
);


--
-- Name: incident_decision_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_decision_status AS ENUM (
    'NONE',
    'DRAFT',
    'PENDING_TASKER_RESPONSE',
    'PENDING_ADMIN_APPROVAL',
    'FINAL'
);


--
-- Name: incident_evidence_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_evidence_purpose AS ENUM (
    'DAMAGE_PHOTO',
    'BEFORE_PHOTO',
    'PURCHASE_RECEIPT',
    'REPAIR_QUOTE',
    'TASKER_STATEMENT',
    'DECISION_RESPONSE',
    'OTHER'
);


--
-- Name: incident_log_dimension; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_log_dimension AS ENUM (
    'STATUS',
    'COMPENSATION'
);


--
-- Name: incident_response_window_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_response_window_status AS ENUM (
    'NONE',
    'OPEN',
    'RESPONDED',
    'EXPIRED',
    'REVIEWED'
);


--
-- Name: incident_responsibility_party; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_responsibility_party AS ENUM (
    'TASKER',
    'PLATFORM',
    'SHARED',
    'UNDETERMINED'
);


--
-- Name: incident_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_severity AS ENUM (
    'CRITICAL',
    'MAJOR',
    'MINOR'
);


--
-- Name: incident_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_status AS ENUM (
    'REPORTED',
    'INVESTIGATING',
    'APPROVED',
    'REJECTED',
    'COMPENSATED',
    'CLOSED'
);


--
-- Name: notification_outbox_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_outbox_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'BOOKING_CONFIRMED',
    'TASKER_ON_THE_WAY',
    'BOOKING_COMPLETED',
    'BOOKING_CANCELLED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'INCIDENT_UPDATE',
    'SUPPORT_REPLY',
    'PROMOTION',
    'SYSTEM'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'CASH',
    'MOMO',
    'ZALOPAY',
    'VNPAY',
    'VIETQR'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);


--
-- Name: policies_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policies_category_enum AS ENUM (
    'LEGAL',
    'CLEANING_STANDARD',
    'INCIDENT_HANDLING',
    'CANCELLATION',
    'CUSTOMER_SUPPORT',
    'PAYMENT',
    'GENERAL'
);


--
-- Name: policies_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policies_role_enum AS ENUM (
    'CUSTOMER',
    'TASKER',
    'ALL'
);


--
-- Name: pricing_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pricing_mode AS ENUM (
    'HOURLY',
    'AREA_HOURLY',
    'FIXED'
);


--
-- Name: resolution_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resolution_type AS ENUM (
    'EXPLANATION',
    'RECLEAN',
    'VOUCHER',
    'REFUND',
    'COMPENSATION',
    'TASKER_PENALTY'
);


--
-- Name: review_report_reason_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_report_reason_enum AS ENUM (
    'SPAM',
    'FAKE',
    'INAPPROPRIATE',
    'HARASSMENT',
    'OTHER'
);


--
-- Name: review_report_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_report_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: support_ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_ticket_status AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'PENDING',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: tasker_deposit_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tasker_deposit_transaction_type AS ENUM (
    'CASH_COMMISSION_DEDUCT',
    'INCIDENT_COMPENSATION_DEDUCT',
    'TOP_UP',
    'TERMINATION_REFUND'
);


--
-- Name: tasker_presence_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tasker_presence_status AS ENUM (
    'ONLINE',
    'OFFLINE'
);


--
-- Name: tasker_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tasker_status AS ENUM (
    'PENDING',
    'TRAINING',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED',
    'TERMINATED'
);


--
-- Name: tasker_withdrawal_requests_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tasker_withdrawal_requests_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'PROCESSED'
);


--
-- Name: ticket_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_category AS ENUM (
    'SERVICE_QUALITY',
    'TASKER_BEHAVIOR',
    'SCHEDULING',
    'PROPERTY_DAMAGE',
    'PAYMENT_BILLING',
    'ACCOUNT_TECHNICAL',
    'OTHER',
    'APPEAL'
);


--
-- Name: ticket_message_audience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_message_audience AS ENUM (
    'REPORTER',
    'COUNTERPARTY',
    'INTERNAL'
);


--
-- Name: ticket_pending_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_pending_reason AS ENUM (
    'WAIT_CUSTOMER',
    'WAIT_TASKER',
    'WAIT_INTERNAL'
);


--
-- Name: ticket_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_priority AS ENUM (
    'URGENT',
    'HIGH',
    'MEDIUM',
    'LOW'
);


--
-- Name: ticket_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_source AS ENUM (
    'CUSTOMER_APP',
    'TASKER_APP',
    'ADMIN',
    'TASKER_APPEAL'
);


--
-- Name: tokens_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tokens_type_enum AS ENUM (
    'refresh',
    'forgot_password',
    'login_otp'
);


--
-- Name: users_provider_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_provider_enum AS ENUM (
    'LOCAL',
    'GOOGLE',
    'FACEBOOK'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'ADMIN',
    'CUSTOMER',
    'TASKER'
);


--
-- Name: vouchers_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vouchers_type_enum AS ENUM (
    'PERCENT',
    'FIXED'
);


--
-- Name: wallet_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_transaction_type AS ENUM (
    'DEPOSIT',
    'WITHDRAW',
    'PAYMENT',
    'REFUND',
    'PLATFORM_FEE',
    'TASKER_EARNING',
    'DEPOSIT_HOLD',
    'DEPOSIT_RELEASE',
    'DEPOSIT_DEDUCT',
    'CANCELLATION_FEE',
    'ADJUSTMENT'
);


--
-- Name: wallets_owner_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallets_owner_type_enum AS ENUM (
    'CUSTOMER',
    'TASKER',
    'SYSTEM'
);


--
-- Name: withdrawal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.withdrawal_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blog_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_bookmarks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(180) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid,
    content text NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_tag_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tag_relations (
    blog_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(80) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: blogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blogs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(280) NOT NULL,
    summary text,
    content text NOT NULL,
    thumbnail_url character varying(500),
    category_id uuid,
    author_id uuid,
    status public.blog_status DEFAULT 'DRAFT'::public.blog_status NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_status_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    old_status public.booking_status,
    new_status public.booking_status NOT NULL,
    note text,
    cancelled_by public.cancelled_by,
    cancel_reason text,
    cancellation_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    refund_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    booking_id uuid,
    changed_by_user_id uuid,
    cancelled_by_user_id uuid,
    payment_id uuid
);


--
-- Name: booking_sub_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_sub_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    sub_service_id uuid NOT NULL,
    price numeric(12,2) NOT NULL,
    duration_hours numeric(4,1) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_default boolean DEFAULT true NOT NULL,
    is_selected boolean DEFAULT true NOT NULL,
    extra_fee numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_code character varying(20) NOT NULL,
    package_id uuid CONSTRAINT bookings_service_id_not_null NOT NULL,
    address text NOT NULL,
    district character varying(100),
    note text,
    scheduled_start timestamp without time zone,
    scheduled_end timestamp without time zone,
    scheduled_start_date date,
    scheduled_start_time time without time zone,
    scheduled_end_date date,
    scheduled_end_time time without time zone,
    duration_hours numeric(4,1) NOT NULL,
    status public.booking_status DEFAULT 'POSTED'::public.booking_status NOT NULL,
    base_price numeric(12,2) NOT NULL,
    addon_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    peak_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    pet_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    waiting_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_price numeric(12,2) NOT NULL,
    payment_method public.payment_method DEFAULT 'CASH'::public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    voucher_id uuid,
    is_recurring boolean DEFAULT false NOT NULL,
    recurring_rule character varying(255),
    cancelled_by public.cancelled_by,
    cancelled_by_user_id uuid,
    checked_in_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_id uuid,
    tasker_id uuid,
    address_id uuid,
    area_m2 numeric(7,1),
    pricing_tier_id uuid
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    icon_url character varying(500),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: coverage_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coverage_areas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    city character varying(50) DEFAULT 'Hà Nội'::character varying NOT NULL,
    transport_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    label character varying(100),
    full_address text NOT NULL,
    ward_detail character varying(255),
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_default boolean DEFAULT false NOT NULL,
    has_pet boolean DEFAULT false NOT NULL,
    contact_name character varying(100),
    contact_phone character varying(20),
    building_floor character varying(100),
    gate character varying(100),
    driver_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_id uuid
);


--
-- Name: customer_incident_strikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_incident_strikes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_id uuid,
    incident_id uuid
);


--
-- Name: customer_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_vouchers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    voucher_id uuid NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'ISSUED'::character varying NOT NULL,
    booking_id uuid,
    reserved_at timestamp without time zone,
    used_at timestamp without time zone
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    default_payment_method public.payment_method DEFAULT 'CASH'::public.payment_method NOT NULL,
    total_bookings integer DEFAULT 0 NOT NULL,
    total_cancelled integer DEFAULT 0 NOT NULL,
    reporting_locked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    updated_by uuid
);


--
-- Name: incident_damage_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_damage_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    description character varying(255) NOT NULL,
    claimed_amount numeric(12,2) NOT NULL,
    verified_amount numeric(12,2),
    approved_amount numeric(12,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    incident_id uuid,
    verification_status public.incident_damage_item_verification_status DEFAULT 'PENDING'::public.incident_damage_item_verification_status NOT NULL
);


--
-- Name: incident_decision_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_decision_responses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    decision_version integer NOT NULL,
    tasker_id uuid NOT NULL,
    response_type public.incident_decision_response_type NOT NULL,
    content text,
    response_revision integer DEFAULT 1 NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_by_admin_id uuid,
    reviewed_at timestamp without time zone,
    review_result public.incident_decision_response_review_result,
    admin_review_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: incident_evidences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_evidences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_url text NOT NULL,
    file_type character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    incident_id uuid,
    damage_item_id uuid,
    uploaded_by_user_id uuid,
    storage_public_id text,
    purpose public.incident_evidence_purpose,
    decision_version integer,
    decision_response_id uuid,
    visibility character varying(30) DEFAULT 'INCIDENT_PARTIES'::character varying NOT NULL,
    is_soft_deleted boolean DEFAULT false NOT NULL,
    soft_deleted_at timestamp without time zone,
    soft_deleted_by_user_id uuid,
    is_active_for_response boolean DEFAULT true NOT NULL,
    replaced_by_evidence_id uuid
);


--
-- Name: incident_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_statements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    body text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    incident_id uuid,
    submitted_by_user_id uuid
);


--
-- Name: incident_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_status_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    dimension public.incident_log_dimension NOT NULL,
    old_value character varying(50),
    new_value character varying(50) NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    incident_id uuid,
    changed_by_user_id uuid
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_code character varying(20),
    title character varying(255) NOT NULL,
    description text NOT NULL,
    severity public.incident_severity DEFAULT 'MINOR'::public.incident_severity NOT NULL,
    status public.incident_status DEFAULT 'REPORTED'::public.incident_status NOT NULL,
    compensation_status public.incident_compensation_status DEFAULT 'NONE'::public.incident_compensation_status NOT NULL,
    closure_reason public.incident_closure_reason,
    claimed_amount numeric(12,2),
    approved_compensation_amount numeric(12,2),
    tasker_borne_amount numeric(12,2),
    platform_borne_amount numeric(12,2),
    allocation_reason text,
    compensation_source character varying(50),
    cooling_until timestamp without time zone,
    received_due_at timestamp without time zone,
    statement_due_at timestamp without time zone,
    decision_due_at timestamp without time zone,
    report_window_until timestamp without time zone,
    reported_at timestamp without time zone DEFAULT now() NOT NULL,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    booking_id uuid,
    customer_id uuid,
    tasker_id uuid,
    decided_by_investigator_id uuid,
    approved_by_checker_id uuid,
    decision_status public.incident_decision_status DEFAULT 'NONE'::public.incident_decision_status NOT NULL,
    decision_version integer DEFAULT 0 NOT NULL,
    response_window_status public.incident_response_window_status DEFAULT 'NONE'::public.incident_response_window_status NOT NULL,
    tasker_response_deadline timestamp without time zone,
    tasker_response_reviewed_at timestamp without time zone,
    responsibility_party public.incident_responsibility_party,
    responsibility_reason text,
    responsibility_decided_by_admin_id uuid,
    responsibility_decided_at timestamp without time zone,
    internal_decision_note text,
    tasker_decision_reason text,
    customer_decision_summary text,
    deposit_balance_snapshot numeric(12,2),
    recoverable_from_deposit_amount numeric(12,2),
    uncovered_liability_amount numeric(12,2),
    decided_by_admin_id uuid,
    second_approval_note text,
    second_approval_requested_at timestamp without time zone,
    second_approval_due_at timestamp without time zone,
    second_approved_by_admin_id uuid,
    second_approved_at timestamp without time zone,
    finalized_by_admin_id uuid,
    finalized_at timestamp without time zone,
    policy_version character varying(80),
    dual_approval_threshold_snapshot numeric(12,2),
    policy_cap_snapshot numeric(12,2),
    response_window_hours_snapshot integer,
    severity_rule_snapshot jsonb,
    tasker_response_extended_at timestamp without time zone
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--



--
-- Name: notification_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_outbox (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_type character varying(80) NOT NULL,
    ref_type character varying(40) NOT NULL,
    ref_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    decision_version integer,
    payload jsonb NOT NULL,
    dedupe_key character varying(180) NOT NULL,
    status public.notification_outbox_status DEFAULT 'PENDING'::public.notification_outbox_status NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp without time zone,
    sent_at timestamp without time zone,
    last_error text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.notification_type DEFAULT 'SYSTEM'::public.notification_type NOT NULL,
    reference_id uuid,
    reference_type character varying(50),
    title character varying(255) NOT NULL,
    content text,
    is_read boolean DEFAULT false NOT NULL,
    dedupe_key character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    CONSTRAINT "CHK_notifications_reference_type" CHECK (((reference_type IS NULL) OR ((reference_type)::text = ANY ((ARRAY['BOOKING'::character varying, 'INCIDENT'::character varying, 'SUPPORT_TICKET'::character varying, 'PAYMENT'::character varying])::text[]))))
);


--
-- Name: package_coverage_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_coverage_areas (
    package_id uuid NOT NULL,
    area_id uuid NOT NULL
);


--
-- Name: package_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_policies (
    package_id uuid NOT NULL,
    policy_id uuid NOT NULL
);


--
-- Name: package_sub_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_sub_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    sub_service_id uuid NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    exclusivity_group_id character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    method public.payment_method NOT NULL,
    status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    amount numeric(12,2) NOT NULL,
    transaction_code character varying(255),
    paid_at timestamp without time zone,
    refunded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    booking_id uuid,
    customer_id uuid
);


--
-- Name: peak_day_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.peak_day_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    start_at timestamp without time zone,
    end_at timestamp without time zone,
    peak_rate numeric(5,2) DEFAULT 0.1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_peak_day_range CHECK ((start_at < end_at))
);


--
-- Name: policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying NOT NULL,
    content text NOT NULL,
    role public.policies_role_enum DEFAULT 'ALL'::public.policies_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    category public.policies_category_enum DEFAULT 'GENERAL'::public.policies_category_enum NOT NULL,
    icon_emoji character varying(10) DEFAULT '📄'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: pricing_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    base_price numeric(12,2) NOT NULL,
    peak_price numeric(12,2),
    pet_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    waiting_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    platform_commission_rate numeric(5,2) DEFAULT '20'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    service_id uuid
);


--
-- Name: pricing_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_tiers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    pricing_mode public.pricing_mode DEFAULT 'HOURLY'::public.pricing_mode NOT NULL,
    area_min_m2 numeric(7,1),
    area_max_m2 numeric(7,1),
    price_per_m2 numeric(12,2),
    price_per_hour numeric(12,2),
    fixed_price numeric(12,2),
    min_hours numeric(3,1) DEFAULT '1'::numeric NOT NULL,
    max_hours numeric(3,1) DEFAULT '8'::numeric NOT NULL,
    default_hours numeric(3,1),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: review_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    reported_by uuid NOT NULL,
    reason public.review_report_reason_enum NOT NULL,
    description text,
    status public.review_report_status_enum DEFAULT 'PENDING'::public.review_report_status_enum NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    admin_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    tasker_id uuid NOT NULL,
    overall_rating numeric(2,1) NOT NULL,
    punctuality integer DEFAULT 5 NOT NULL,
    cleanliness integer DEFAULT 5 NOT NULL,
    friendliness integer DEFAULT 5 NOT NULL,
    satisfaction integer DEFAULT 5 NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    package_id uuid,
    is_hidden boolean DEFAULT false NOT NULL,
    admin_reply text,
    is_anonymous boolean DEFAULT false NOT NULL,
    images text,
    tasker_reply text,
    tasker_replied_at timestamp without time zone,
    report_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_addons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    price_unit character varying(50) DEFAULT 'per_item'::character varying,
    duration_minutes integer,
    max_quantity integer,
    sort_order integer DEFAULT 0,
    icon_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_durations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_durations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    duration_hours numeric(4,1) NOT NULL,
    price_multiplier numeric(5,2) DEFAULT '1'::numeric NOT NULL,
    is_popular boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    suggested_area integer,
    tasker_count integer DEFAULT 1 NOT NULL,
    title character varying,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_packages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    package_code character varying(255) NOT NULL,
    icon_url character varying(500),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    max_hours numeric(4,1) DEFAULT '8'::numeric NOT NULL,
    terms_and_conditions text,
    policy_description text,
    night_surcharge numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    pet_surcharge numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    waiting_surcharge numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tool_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    peak_rate_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    pricing_mode public.pricing_mode DEFAULT 'HOURLY'::public.pricing_mode,
    gallery_urls jsonb,
    base_hourly_rate numeric(12,2) DEFAULT 0 NOT NULL,
    premium_hourly_rate numeric(12,2) DEFAULT 0 NOT NULL,
    allow_multiple_taskers boolean DEFAULT false NOT NULL,
    allow_subscription boolean DEFAULT false NOT NULL,
    allow_single_service boolean DEFAULT true NOT NULL
);


--
-- Name: service_peak_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_peak_hours (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_hour character varying(10) NOT NULL,
    end_hour character varying(10) NOT NULL,
    multiplier numeric(5,2) DEFAULT '1'::numeric NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_sub_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_sub_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    sub_service_id uuid NOT NULL,
    price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    sessions_per_cycle integer,
    commitment_months integer,
    bonus_description text,
    is_popular boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: service_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_service_id uuid,
    package_id uuid,
    name character varying(200) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    service_code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_duration_hours numeric(4,1),
    coverage_area text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    thumbnail_url character varying(500),
    gallery_urls jsonb,
    short_description character varying(500),
    included_tasks jsonb,
    excluded_tasks jsonb,
    pricing_config_id uuid,
    category_id uuid
);


--
-- Name: sub_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sub_service_code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    duration_hours numeric(4,1) DEFAULT '1'::numeric,
    coverage_area text,
    is_active boolean DEFAULT true NOT NULL,
    thumbnail_url character varying(500),
    gallery_urls jsonb,
    short_description character varying(500),
    included_tasks jsonb,
    excluded_tasks jsonb,
    terms_and_conditions text,
    pricing_type character varying(20) DEFAULT 'FIXED'::character varying NOT NULL,
    pricing_config_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_code character varying(20),
    subject character varying(255) NOT NULL,
    description text,
    category public.ticket_category DEFAULT 'OTHER'::public.ticket_category NOT NULL,
    subtype character varying(100),
    priority public.ticket_priority DEFAULT 'MEDIUM'::public.ticket_priority NOT NULL,
    status public.support_ticket_status DEFAULT 'NEW'::public.support_ticket_status NOT NULL,
    source public.ticket_source DEFAULT 'CUSTOMER_APP'::public.ticket_source NOT NULL,
    first_response_due_at timestamp without time zone,
    resolution_due_at timestamp without time zone,
    first_responded_at timestamp without time zone,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    sla_paused_at timestamp without time zone,
    sla_paused_accum_ms bigint DEFAULT '0'::bigint NOT NULL,
    sla_breached boolean DEFAULT false NOT NULL,
    pending_reason public.ticket_pending_reason,
    incident_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    booking_id uuid,
    reporter_user_id uuid,
    counterparty_user_id uuid,
    assigned_admin_id uuid
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tasker_deposit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasker_deposit_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.tasker_deposit_transaction_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_before numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    tasker_id uuid,
    booking_id uuid
);


--
-- Name: tasker_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasker_levels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    min_points integer DEFAULT 0 NOT NULL,
    color character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tasker_penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasker_penalties (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tasker_id uuid NOT NULL,
    type public.ban_type NOT NULL,
    reason text NOT NULL,
    ban_ends_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tasker_withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasker_withdrawal_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tasker_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status public.tasker_withdrawal_requests_status_enum DEFAULT 'PENDING'::public.tasker_withdrawal_requests_status_enum NOT NULL,
    bank_account character varying(255),
    bank_name character varying(100),
    note text,
    reviewed_at timestamp without time zone,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    admin_note text,
    proof_image_url character varying(500)
);


--
-- Name: taskers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taskers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    working_address text,
    bio text,
    experience text,
    skills text,
    status public.tasker_status DEFAULT 'PENDING'::public.tasker_status NOT NULL,
    deposit_amount numeric(12,2) DEFAULT '400000'::numeric NOT NULL,
    current_deposit_balance numeric(12,2) DEFAULT '400000'::numeric NOT NULL,
    rating_avg numeric(3,2) DEFAULT '5'::numeric NOT NULL,
    total_completed_jobs integer DEFAULT 0 NOT NULL,
    total_working_hours numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    level_id uuid,
    doc_type public.document_type,
    doc_id_number character varying(50),
    doc_front_url text,
    doc_back_url text,
    criminal_record_url text,
    health_certificate_url text,
    certificate_url text,
    doc_issued_date date,
    doc_expired_date date,
    doc_status public.document_status DEFAULT 'PENDING'::public.document_status NOT NULL,
    doc_reviewed_at timestamp without time zone,
    doc_note text,
    ban_reason character varying(500),
    deposit_topup_due timestamp without time zone,
    presence_status public.tasker_presence_status DEFAULT 'OFFLINE'::public.tasker_presence_status NOT NULL,
    bank_name character varying(100),
    bank_account_number character varying(50),
    bank_account_name character varying(150),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    ban_ends_at timestamp without time zone,
    doc_reviewed_by uuid,
    updated_by uuid,
    warning_points integer DEFAULT 0 NOT NULL,
    cancel_suspended_until timestamp without time zone,
    current_location public.geography(Point,4326),
    location_updated_at timestamp with time zone
);


--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    url text NOT NULL,
    public_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ticket_id uuid,
    message_id uuid,
    uploaded_by_user_id uuid
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    body text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ticket_id uuid,
    sender_user_id uuid,
    audience public.ticket_message_audience DEFAULT 'REPORTER'::public.ticket_message_audience NOT NULL
);


--
-- Name: ticket_resolutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_resolutions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.resolution_type NOT NULL,
    amount numeric(12,2),
    voucher_id uuid,
    reclean_booking_id uuid,
    wallet_transaction_id uuid,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ticket_id uuid,
    proposed_by_user_id uuid
);


--
-- Name: ticket_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_status_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    old_status public.support_ticket_status,
    new_status public.support_ticket_status NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ticket_id uuid,
    changed_by_user_id uuid
);


--
-- Name: ticket_surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_surveys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rating smallint,
    comment text,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ticket_id uuid,
    CONSTRAINT "CHK_ticket_survey_rating" CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: ticket_thread_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_thread_reads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    audience public.ticket_message_audience NOT NULL,
    last_read_message_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.tokens_type_enum NOT NULL,
    token character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    "userId" uuid,
    attempts integer DEFAULT 0 NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    phone character varying(11),
    password_hash character varying,
    avatar_url character varying,
    full_name character varying(100) NOT NULL,
    role public.users_role_enum DEFAULT 'CUSTOMER'::public.users_role_enum NOT NULL,
    provider public.users_provider_enum DEFAULT 'LOCAL'::public.users_provider_enum NOT NULL,
    provider_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    last_login timestamp without time zone,
    deleted_at timestamp without time zone,
    must_change_password boolean DEFAULT false NOT NULL,
    token_version integer DEFAULT 0 NOT NULL
);


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type public.vouchers_type_enum NOT NULL,
    value numeric(12,2) NOT NULL,
    max_discount numeric(12,2),
    min_order_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    service_id uuid,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    per_customer_limit integer,
    reserved_count integer DEFAULT 0 NOT NULL,
    package_ids jsonb,
    customer_ids jsonb
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reference_id uuid,
    reference_type character varying(50),
    type public.wallet_transaction_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_before numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    wallet_id uuid,
    booking_id uuid
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_type public.wallets_owner_type_enum NOT NULL,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hold_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_id uuid,
    tasker_id uuid,
    CONSTRAINT chk_wallet_owner CHECK ((((owner_type = 'CUSTOMER'::public.wallets_owner_type_enum) AND (customer_id IS NOT NULL) AND (tasker_id IS NULL)) OR ((owner_type = 'TASKER'::public.wallets_owner_type_enum) AND (tasker_id IS NOT NULL) AND (customer_id IS NULL)) OR ((owner_type = 'SYSTEM'::public.wallets_owner_type_enum) AND (customer_id IS NULL) AND (tasker_id IS NULL))))
);


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tasker_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status public.withdrawal_status DEFAULT 'PENDING'::public.withdrawal_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    step_order integer DEFAULT 1 NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    duration_minutes integer,
    is_required boolean DEFAULT true NOT NULL,
    icon character varying(50),
    checklist_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: coverage_areas PK_0176a96d781b8cfa1723b2929f1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_areas
    ADD CONSTRAINT "PK_0176a96d781b8cfa1723b2929f1" PRIMARY KEY (id);


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: reviews PK_231ae565c273ee700b283f15c1d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY (id);


--
-- Name: categories PK_24dbc6126a28ff948da33e97d3b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY (id);


--
-- Name: system_configs PK_29ac548e654c799fd885e1b9b71; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT "PK_29ac548e654c799fd885e1b9b71" PRIMARY KEY (id);


--
-- Name: ticket_surveys PK_2e61bb81b9754cc165badc790ce; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_surveys
    ADD CONSTRAINT "PK_2e61bb81b9754cc165badc790ce" PRIMARY KEY (id);


--
-- Name: tokens PK_3001e89ada36263dabf1fb6210a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY (id);


--
-- Name: customer_addresses PK_336bda7b0a0cd04241f719fc834; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT "PK_336bda7b0a0cd04241f719fc834" PRIMARY KEY (id);


--
-- Name: tasker_withdrawal_requests PK_346777f85c4f5d033047d178fbe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_withdrawal_requests
    ADD CONSTRAINT "PK_346777f85c4f5d033047d178fbe" PRIMARY KEY (id);


--
-- Name: ticket_messages PK_37beb692dedf7eccb4e519ccec1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "PK_37beb692dedf7eccb4e519ccec1" PRIMARY KEY (id);


--
-- Name: taskers PK_37c2e996f067382c86dda5a9dd0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskers
    ADD CONSTRAINT "PK_37c2e996f067382c86dda5a9dd0" PRIMARY KEY (id);


--
-- Name: wallet_transactions PK_5120f131bde2cda940ec1a621db; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY (id);


--
-- Name: policies PK_603e09f183df0108d8695c57e28; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT "PK_603e09f183df0108d8695c57e28" PRIMARY KEY (id);


--
-- Name: booking_sub_services PK_64ae475065310e9d6b1bb36f8a1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_sub_services
    ADD CONSTRAINT "PK_64ae475065310e9d6b1bb36f8a1" PRIMARY KEY (id);


--
-- Name: pricing_configs PK_68f45b3c5c0404cfa95eada68f2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_configs
    ADD CONSTRAINT "PK_68f45b3c5c0404cfa95eada68f2" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: tasker_levels PK_7a1e40c0b42cb432d7b39241587; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_levels
    ADD CONSTRAINT "PK_7a1e40c0b42cb432d7b39241587" PRIMARY KEY (id);


--
-- Name: ticket_status_logs PK_7c6d819f63bf300128f720048dc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_status_logs
    ADD CONSTRAINT "PK_7c6d819f63bf300128f720048dc" PRIMARY KEY (id);


--
-- Name: ticket_attachments PK_7e5011f87f95e78fe4bd7d982a3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT "PK_7e5011f87f95e78fe4bd7d982a3" PRIMARY KEY (id);


--
-- Name: incident_evidences PK_7eb5c331e73693403c33e10135b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT "PK_7eb5c331e73693403c33e10135b" PRIMARY KEY (id);


--
-- Name: wallets PK_8402e5df5a30a229380e83e4f7e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);


--
-- Name: sub_services PK_8d0808cbbab4fad02bc41183a70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_services
    ADD CONSTRAINT "PK_8d0808cbbab4fad02bc41183a70" PRIMARY KEY (id);


--
-- Name: ticket_resolutions PK_8d660124143985f4c7944c2ae23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_resolutions
    ADD CONSTRAINT "PK_8d660124143985f4c7944c2ae23" PRIMARY KEY (id);


--
-- Name: tasker_deposit_transactions PK_92e3d909cd0db990f74a43c1dac; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_deposit_transactions
    ADD CONSTRAINT "PK_92e3d909cd0db990f74a43c1dac" PRIMARY KEY (id);


--
-- Name: support_tickets PK_942e8d8f5df86100471d2324643; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY (id);


--
-- Name: withdrawals PK_9871ec481baa7755f8bd8b7c7e9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY (id);


--
-- Name: incident_damage_items PK_9b42708e79060e356cdef0c7fd8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_damage_items
    ADD CONSTRAINT "PK_9b42708e79060e356cdef0c7fd8" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: package_coverage_areas PK_a910899bb0812395e8d3eb80f41; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_coverage_areas
    ADD CONSTRAINT "PK_a910899bb0812395e8d3eb80f41" PRIMARY KEY (package_id, area_id);


--
-- Name: package_sub_services PK_ae01eeeaacd69312a8ec92491f9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_sub_services
    ADD CONSTRAINT "PK_ae01eeeaacd69312a8ec92491f9" PRIMARY KEY (id);


--
-- Name: customer_vouchers PK_ae417e91ab934d36629f77ce065; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_vouchers
    ADD CONSTRAINT "PK_ae417e91ab934d36629f77ce065" PRIMARY KEY (id);


--
-- Name: customer_incident_strikes PK_b06e28b5be050dce72a7dc2abf8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_incident_strikes
    ADD CONSTRAINT "PK_b06e28b5be050dce72a7dc2abf8" PRIMARY KEY (id);


--
-- Name: services PK_ba2d347a3168a296416c6c5ccb2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY (id);


--
-- Name: bookings PK_bee6805982cc1e248e94ce94957; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id);


--
-- Name: blog_bookmarks PK_blog_bookmarks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_bookmarks
    ADD CONSTRAINT "PK_blog_bookmarks" PRIMARY KEY (id);


--
-- Name: blog_categories PK_blog_categories; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT "PK_blog_categories" PRIMARY KEY (id);


--
-- Name: blog_comments PK_blog_comments; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT "PK_blog_comments" PRIMARY KEY (id);


--
-- Name: blog_tag_relations PK_blog_tag_relations; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tag_relations
    ADD CONSTRAINT "PK_blog_tag_relations" PRIMARY KEY (blog_id, tag_id);


--
-- Name: blog_tags PK_blog_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT "PK_blog_tags" PRIMARY KEY (id);


--
-- Name: blogs PK_blogs; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT "PK_blogs" PRIMARY KEY (id);


--
-- Name: incidents PK_ccb34c01719889017e2246469f9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "PK_ccb34c01719889017e2246469f9" PRIMARY KEY (id);


--
-- Name: service_packages PK_d602a30f23af1a0ecf7c8e994df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_packages
    ADD CONSTRAINT "PK_d602a30f23af1a0ecf7c8e994df" PRIMARY KEY (id);


--
-- Name: incident_statements PK_e86291c46c62bb9be5d9800a6ce; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_statements
    ADD CONSTRAINT "PK_e86291c46c62bb9be5d9800a6ce" PRIMARY KEY (id);


--
-- Name: service_sub_services PK_e904ad34f256eddd022caf0a976; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_sub_services
    ADD CONSTRAINT "PK_e904ad34f256eddd022caf0a976" PRIMARY KEY (id);


--
-- Name: vouchers PK_ed1b7dd909a696560763acdbc04; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY (id);


--
-- Name: peak_day_configs PK_f2cd5780ad99ec6d0eb0a6fc4bc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peak_day_configs
    ADD CONSTRAINT "PK_f2cd5780ad99ec6d0eb0a6fc4bc" PRIMARY KEY (id);


--
-- Name: incident_status_logs PK_f5224eb24e4173a0e782e5866bd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_status_logs
    ADD CONSTRAINT "PK_f5224eb24e4173a0e782e5866bd" PRIMARY KEY (id);


--
-- Name: booking_status_logs PK_f5ec1a5a9046c21b40ad1c35561; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_logs
    ADD CONSTRAINT "PK_f5ec1a5a9046c21b40ad1c35561" PRIMARY KEY (id);


--
-- Name: package_policies PK_package_policies; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_policies
    ADD CONSTRAINT "PK_package_policies" PRIMARY KEY (package_id, policy_id);


--
-- Name: pricing_tiers PK_pricing_tiers; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_tiers
    ADD CONSTRAINT "PK_pricing_tiers" PRIMARY KEY (id);


--
-- Name: review_reports PK_review_reports; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT "PK_review_reports" PRIMARY KEY (id);


--
-- Name: service_addons PK_service_addons; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_addons
    ADD CONSTRAINT "PK_service_addons" PRIMARY KEY (id);


--
-- Name: service_durations PK_service_durations; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_durations
    ADD CONSTRAINT "PK_service_durations" PRIMARY KEY (id);


--
-- Name: service_peak_hours PK_service_peak_hours; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_peak_hours
    ADD CONSTRAINT "PK_service_peak_hours" PRIMARY KEY (id);


--
-- Name: service_subscriptions PK_service_subscriptions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_subscriptions
    ADD CONSTRAINT "PK_service_subscriptions" PRIMARY KEY (id);


--
-- Name: service_workflows PK_service_workflows; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_workflows
    ADD CONSTRAINT "PK_service_workflows" PRIMARY KEY (id);


--
-- Name: ticket_thread_reads PK_ticket_thread_reads; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_thread_reads
    ADD CONSTRAINT "PK_ticket_thread_reads" PRIMARY KEY (id);


--
-- Name: workflow_steps PK_workflow_steps; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT "PK_workflow_steps" PRIMARY KEY (id);


--
-- Name: customers REL_11d81cd7be87b6f8865b0cf766; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "REL_11d81cd7be87b6f8865b0cf766" UNIQUE (user_id);


--
-- Name: taskers REL_14773e687ebdd304693d30787a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskers
    ADD CONSTRAINT "REL_14773e687ebdd304693d30787a" UNIQUE (user_id);


--
-- Name: ticket_surveys REL_7724c54f5ad18c6850d9416c15; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_surveys
    ADD CONSTRAINT "REL_7724c54f5ad18c6850d9416c15" UNIQUE (ticket_id);


--
-- Name: categories UQ_420d9f679d41281f282f5bc7d09; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE (slug);


--
-- Name: sub_services UQ_4a07cea2983106bec7942159df7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_services
    ADD CONSTRAINT "UQ_4a07cea2983106bec7942159df7" UNIQUE (sub_service_code);


--
-- Name: service_packages UQ_5d18904b7380627ecc4e37bb4a8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_packages
    ADD CONSTRAINT "UQ_5d18904b7380627ecc4e37bb4a8" UNIQUE (package_code);


--
-- Name: bookings UQ_796e0227e4beff186bdd72ac53b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "UQ_796e0227e4beff186bdd72ac53b" UNIQUE (booking_code);


--
-- Name: system_configs UQ_8430d4ebdc1faef3d3eeef36e87; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT "UQ_8430d4ebdc1faef3d3eeef36e87" UNIQUE (config_key);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: reviews UQ_bbd6ac6e3e6a8f8c6e0e8692d63; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63" UNIQUE (booking_id);


--
-- Name: vouchers UQ_efc30b2b9169e05e0e1e19d6dd6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "UQ_efc30b2b9169e05e0e1e19d6dd6" UNIQUE (code);


--
-- Name: services UQ_f05131015973a4c74d7052b69ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "UQ_f05131015973a4c74d7052b69ab" UNIQUE (service_code);


--
-- Name: policies UQ_fbb46ad645d0f8767847530c8e3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT "UQ_fbb46ad645d0f8767847530c8e3" UNIQUE (slug);


--
-- Name: incident_decision_responses pk_incident_decision_responses; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_decision_responses
    ADD CONSTRAINT pk_incident_decision_responses PRIMARY KEY (id);


--
-- Name: notification_outbox pk_notification_outbox; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT pk_notification_outbox PRIMARY KEY (id);


--
-- Name: tasker_penalties pk_tasker_penalties; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_penalties
    ADD CONSTRAINT pk_tasker_penalties PRIMARY KEY (id);


--
-- Name: incident_decision_responses uq_idr_incident_version_tasker; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_decision_responses
    ADD CONSTRAINT uq_idr_incident_version_tasker UNIQUE (incident_id, decision_version, tasker_id);


--
-- Name: notification_outbox uq_notification_outbox_dedupe_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT uq_notification_outbox_dedupe_key UNIQUE (dedupe_key);


--
-- Name: services uq_services_service_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT uq_services_service_code UNIQUE (service_code);


--
-- Name: ticket_thread_reads uq_ttr_ticket_user_audience; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_thread_reads
    ADD CONSTRAINT uq_ttr_ticket_user_audience UNIQUE (ticket_id, user_id, audience);


--
-- Name: IDX_080fc39607b5397a3a3576802e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_080fc39607b5397a3a3576802e" ON public.package_policies USING btree (policy_id);


--
-- Name: IDX_8a5f074c0577466123ff32befd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8a5f074c0577466123ff32befd" ON public.package_policies USING btree (package_id);


--
-- Name: IDX_cc7b6205936d8c13d2ddafe014; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cc7b6205936d8c13d2ddafe014" ON public.package_coverage_areas USING btree (area_id);


--
-- Name: IDX_e1a6a844aa22491dc799fc85d4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e1a6a844aa22491dc799fc85d4" ON public.package_coverage_areas USING btree (package_id);


--
-- Name: IDX_steps_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_steps_workflow_id" ON public.workflow_steps USING btree (workflow_id);


--
-- Name: IDX_workflows_package_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_workflows_package_id" ON public.service_workflows USING btree (package_id);


--
-- Name: IDX_workflows_sub_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_workflows_sub_service_id" ON public.service_workflows USING btree (sub_service_id);


--
-- Name: UQ_blog_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_blog_categories_slug" ON public.blog_categories USING btree (slug);


--
-- Name: UQ_blog_tags_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_blog_tags_name" ON public.blog_tags USING btree (name);


--
-- Name: UQ_blog_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_blog_tags_slug" ON public.blog_tags USING btree (slug);


--
-- Name: UQ_blogs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UQ_blogs_slug" ON public.blogs USING btree (slug);


--
-- Name: idx_blogs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_category ON public.blogs USING btree (category_id);


--
-- Name: idx_blogs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_status ON public.blogs USING btree (status);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_cis_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cis_customer ON public.customer_incident_strikes USING btree (customer_id);


--
-- Name: idx_idi_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idi_incident ON public.incident_damage_items USING btree (incident_id);


--
-- Name: idx_idr_incident_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idr_incident_version ON public.incident_decision_responses USING btree (incident_id, decision_version);


--
-- Name: idx_ie_damage_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ie_damage_item ON public.incident_evidences USING btree (damage_item_id);


--
-- Name: idx_ie_decision_response; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ie_decision_response ON public.incident_evidences USING btree (decision_response_id);


--
-- Name: idx_ie_purpose_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ie_purpose_version ON public.incident_evidences USING btree (purpose, decision_version);


--
-- Name: idx_inc_severity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inc_severity_created ON public.incidents USING btree (severity, created_at);


--
-- Name: idx_inc_status_comp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inc_status_comp ON public.incidents USING btree (status, compensation_status);


--
-- Name: idx_incidents_decision_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_decision_status ON public.incidents USING btree (decision_status);


--
-- Name: idx_incidents_responsibility_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_responsibility_party ON public.incidents USING btree (responsibility_party);


--
-- Name: idx_incidents_tasker_response_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_tasker_response_deadline ON public.incidents USING btree (tasker_response_deadline);


--
-- Name: idx_isl_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isl_incident ON public.incident_status_logs USING btree (incident_id, created_at);


--
-- Name: idx_ist_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ist_incident ON public.incident_statements USING btree (incident_id, created_at);


--
-- Name: idx_notification_outbox_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_outbox_ref ON public.notification_outbox USING btree (ref_type, ref_id);


--
-- Name: idx_notification_outbox_status_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_outbox_status_retry ON public.notification_outbox USING btree (status, next_retry_at);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_reference ON public.notifications USING btree (reference_id, reference_type);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_peak_day_configs_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peak_day_configs_range ON public.peak_day_configs USING btree (start_at);


--
-- Name: idx_pricing_tiers_package_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_tiers_package_id ON public.pricing_tiers USING btree (package_id);


--
-- Name: idx_review_reports_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_reports_review ON public.review_reports USING btree (review_id);


--
-- Name: idx_review_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_reports_status ON public.review_reports USING btree (status);


--
-- Name: idx_reviews_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_reviews_booking ON public.reviews USING btree (booking_id);


--
-- Name: idx_reviews_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_created ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_package ON public.reviews USING btree (package_id);


--
-- Name: idx_reviews_tasker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_tasker ON public.reviews USING btree (tasker_id);


--
-- Name: idx_service_packages_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_service_packages_code ON public.service_packages USING btree (package_code);


--
-- Name: idx_services_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_is_active ON public.services USING btree (is_active);


--
-- Name: idx_st_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_assigned ON public.support_tickets USING btree (assigned_admin_id);


--
-- Name: idx_st_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_booking ON public.support_tickets USING btree (booking_id);


--
-- Name: idx_st_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_reporter ON public.support_tickets USING btree (reporter_user_id);


--
-- Name: idx_st_status_priority_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_status_priority_created ON public.support_tickets USING btree (status, priority, created_at);


--
-- Name: idx_sub_services_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_services_is_active ON public.sub_services USING btree (is_active);


--
-- Name: idx_ta_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ta_ticket ON public.ticket_attachments USING btree (ticket_id);


--
-- Name: idx_tasker_deposit_transactions_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_deposit_transactions_booking ON public.tasker_deposit_transactions USING btree (booking_id);


--
-- Name: idx_tasker_deposit_transactions_tasker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_deposit_transactions_tasker ON public.tasker_deposit_transactions USING btree (tasker_id);


--
-- Name: idx_tasker_penalties_tasker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_penalties_tasker ON public.tasker_penalties USING btree (tasker_id);


--
-- Name: idx_tasker_withdrawal_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_withdrawal_status ON public.tasker_withdrawal_requests USING btree (status);


--
-- Name: idx_tasker_withdrawal_tasker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_withdrawal_tasker_id ON public.tasker_withdrawal_requests USING btree (tasker_id);


--
-- Name: idx_tasker_withdrawal_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasker_withdrawal_wallet_id ON public.tasker_withdrawal_requests USING btree (wallet_id);


--
-- Name: idx_taskers_location_online; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taskers_location_online ON public.taskers USING gist (current_location) WHERE ((presence_status = 'ONLINE'::public.tasker_presence_status) AND (status = 'ACTIVE'::public.tasker_status));


--
-- Name: idx_tm_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_ticket ON public.ticket_messages USING btree (ticket_id, created_at);


--
-- Name: idx_tr_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tr_ticket ON public.ticket_resolutions USING btree (ticket_id);


--
-- Name: idx_tsl_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tsl_ticket ON public.ticket_status_logs USING btree (ticket_id, created_at);


--
-- Name: idx_ttr_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ttr_ticket ON public.ticket_thread_reads USING btree (ticket_id);


--
-- Name: idx_vouchers_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vouchers_active_dates ON public.vouchers USING btree (start_date);


--
-- Name: idx_wallet_transactions_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_booking_id ON public.wallet_transactions USING btree (booking_id);


--
-- Name: idx_wallet_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions USING btree (created_at);


--
-- Name: idx_wallet_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_reference ON public.wallet_transactions USING btree (reference_id, reference_type);


--
-- Name: idx_wallet_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions USING btree (type);


--
-- Name: idx_wallet_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: idx_wallets_owner_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_owner_type ON public.wallets USING btree (owner_type);


--
-- Name: uq_blog_bookmarks_user_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_blog_bookmarks_user_blog ON public.blog_bookmarks USING btree (user_id, blog_id);


--
-- Name: uq_notifications_dedupe_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_notifications_dedupe_key ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: uq_voucher_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_voucher_code ON public.vouchers USING btree (code);


--
-- Name: uq_wallet_tx_incident_compensation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wallet_tx_incident_compensation ON public.wallet_transactions USING btree (reference_type, reference_id, type) WHERE ((reference_type)::text = 'INCIDENT_COMPENSATION'::text);


--
-- Name: uq_wallets_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wallets_customer ON public.wallets USING btree (customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: uq_wallets_system; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wallets_system ON public.wallets USING btree (owner_type) WHERE (owner_type = 'SYSTEM'::public.wallets_owner_type_enum);


--
-- Name: uq_wallets_tasker; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wallets_tasker ON public.wallets USING btree (tasker_id) WHERE (tasker_id IS NOT NULL);


--
-- Name: ticket_attachments FK_0301cfaf908edba6ce419eb66b0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT "FK_0301cfaf908edba6ce419eb66b0" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_attachments FK_0571b827b74076e72e0221d13de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT "FK_0571b827b74076e72e0221d13de" FOREIGN KEY (message_id) REFERENCES public.ticket_messages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: package_policies FK_080fc39607b5397a3a3576802ed; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_policies
    ADD CONSTRAINT "FK_080fc39607b5397a3a3576802ed" FOREIGN KEY (policy_id) REFERENCES public.policies(id);


--
-- Name: incident_statements FK_10f1ce406fe4711c9065ba686a1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_statements
    ADD CONSTRAINT "FK_10f1ce406fe4711c9065ba686a1" FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customers FK_11d81cd7be87b6f8865b0cf7661; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incidents FK_1310173d16de1076b3dd63dd668; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "FK_1310173d16de1076b3dd63dd668" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wallet_transactions FK_14355451ca51402529acd2e2ed2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "FK_14355451ca51402529acd2e2ed2" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: taskers FK_14773e687ebdd304693d30787a2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskers
    ADD CONSTRAINT "FK_14773e687ebdd304693d30787a2" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_resolutions FK_15a380c71fb7affe74eead88c64; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_resolutions
    ADD CONSTRAINT "FK_15a380c71fb7affe74eead88c64" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings FK_1b64199f5630ac1b020fc7de9e5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_1b64199f5630ac1b020fc7de9e5" FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ticket_resolutions FK_1ba9b12bfbdf15b296fadfcd156; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_resolutions
    ADD CONSTRAINT "FK_1ba9b12bfbdf15b296fadfcd156" FOREIGN KEY (proposed_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ticket_thread_reads FK_1c8411a7167b32569456213c08d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_thread_reads
    ADD CONSTRAINT "FK_1c8411a7167b32569456213c08d" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_sub_services FK_1d69ca028609c17a6ec7a401c5c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_sub_services
    ADD CONSTRAINT "FK_1d69ca028609c17a6ec7a401c5c" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: incidents FK_1f3ef187d743269ffd3b808fc0b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "FK_1f3ef187d743269ffd3b808fc0b" FOREIGN KEY (decided_by_investigator_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: services FK_1f8d1173481678a035b4a81a4ec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: booking_status_logs FK_21c42d93bdff461b6abfaf19a72; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_logs
    ADD CONSTRAINT "FK_21c42d93bdff461b6abfaf19a72" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_vouchers FK_280dc2ff901ba4b305398f7c2d1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_vouchers
    ADD CONSTRAINT "FK_280dc2ff901ba4b305398f7c2d1" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: booking_status_logs FK_293c9f501b5290880a0428f848a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_logs
    ADD CONSTRAINT "FK_293c9f501b5290880a0428f848a" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasker_withdrawal_requests FK_2af50fc317b474555af1647ba68; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_withdrawal_requests
    ADD CONSTRAINT "FK_2af50fc317b474555af1647ba68" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: ticket_status_logs FK_2ef7187d2b0f411cea0b0498481; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_status_logs
    ADD CONSTRAINT "FK_2ef7187d2b0f411cea0b0498481" FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: package_sub_services FK_34f40d449a715e7153a45a5dd41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_sub_services
    ADD CONSTRAINT "FK_34f40d449a715e7153a45a5dd41" FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE CASCADE;


--
-- Name: ticket_thread_reads FK_3b95fb7bd115c684569826aa649; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_thread_reads
    ADD CONSTRAINT "FK_3b95fb7bd115c684569826aa649" FOREIGN KEY (last_read_message_id) REFERENCES public.ticket_messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings FK_402873fd6596d556781ac5d8ae4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_402873fd6596d556781ac5d8ae4" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_statements FK_45c0a81a7809ccb528b6692c825; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_statements
    ADD CONSTRAINT "FK_45c0a81a7809ccb528b6692c825" FOREIGN KEY (submitted_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_peak_hours FK_4810def79c42eede27f7ce01c58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_peak_hours
    ADD CONSTRAINT "FK_4810def79c42eede27f7ce01c58" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: customer_incident_strikes FK_4b05221d2a3e27b4f2acbb02c02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_incident_strikes
    ADD CONSTRAINT "FK_4b05221d2a3e27b4f2acbb02c02" FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: services FK_4d1d4c9e8220e8d64f6904c7dbb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "FK_4d1d4c9e8220e8d64f6904c7dbb" FOREIGN KEY (pricing_config_id) REFERENCES public.pricing_configs(id) ON DELETE SET NULL;


--
-- Name: booking_sub_services FK_52a00c84772520ee19b9e16d7dc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_sub_services
    ADD CONSTRAINT "FK_52a00c84772520ee19b9e16d7dc" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: service_subscriptions FK_593c199d992e9f3e9658da058da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_subscriptions
    ADD CONSTRAINT "FK_593c199d992e9f3e9658da058da" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: booking_status_logs FK_59fc6614bb8e402ca04b70498c0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_logs
    ADD CONSTRAINT "FK_59fc6614bb8e402ca04b70498c0" FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sub_services FK_5c2f8bc9f177a0c0fa5ea3e1e98; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_services
    ADD CONSTRAINT "FK_5c2f8bc9f177a0c0fa5ea3e1e98" FOREIGN KEY (pricing_config_id) REFERENCES public.pricing_configs(id) ON DELETE SET NULL;


--
-- Name: customer_vouchers FK_5d66d730e4a014373f201fe8a99; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_vouchers
    ADD CONSTRAINT "FK_5d66d730e4a014373f201fe8a99" FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE;


--
-- Name: wallets FK_6580899a2293de27787376887fa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_tickets FK_6605ed8112884d5d8efae3cdc6c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "FK_6605ed8112884d5d8efae3cdc6c" FOREIGN KEY (reporter_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customer_addresses FK_6be4e1a698f5c3f2c2e4c75c186; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT "FK_6be4e1a698f5c3f2c2e4c75c186" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings FK_6be8707748f3ac879b552a05216; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_6be8707748f3ac879b552a05216" FOREIGN KEY (address_id) REFERENCES public.customer_addresses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents FK_6caad38ca61ab3059e26e19187f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "FK_6caad38ca61ab3059e26e19187f" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_status_logs FK_729efee54e1bf7b6deeeafb010d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_status_logs
    ADD CONSTRAINT "FK_729efee54e1bf7b6deeeafb010d" FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_messages FK_75b3a5f421dbf7b73778da519cb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incidents FK_76969f00a2070f52ab67b130b9b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "FK_76969f00a2070f52ab67b130b9b" FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_surveys FK_7724c54f5ad18c6850d9416c15b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_surveys
    ADD CONSTRAINT "FK_7724c54f5ad18c6850d9416c15b" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: booking_sub_services FK_7ac1e8135c6bdf716dca6451ee5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_sub_services
    ADD CONSTRAINT "FK_7ac1e8135c6bdf716dca6451ee5" FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE RESTRICT;


--
-- Name: service_workflows FK_7f9f6d2610d8ebc5336572fe47c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_workflows
    ADD CONSTRAINT "FK_7f9f6d2610d8ebc5336572fe47c" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: vouchers FK_820556fd3264ae9abfe7cbc0734; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY (service_id) REFERENCES public.sub_services(id) ON DELETE SET NULL;


--
-- Name: incident_evidences FK_8545d2fd85e9232e2e69231e1fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT "FK_8545d2fd85e9232e2e69231e1fd" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_addons FK_8a2e75837ac3933c67a7405f1b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_addons
    ADD CONSTRAINT "FK_8a2e75837ac3933c67a7405f1b8" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: package_policies FK_8a5f074c0577466123ff32befd4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_policies
    ADD CONSTRAINT "FK_8a5f074c0577466123ff32befd4" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings FK_8e21b7ae33e7b0673270de4146f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_8e21b7ae33e7b0673270de4146f" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_damage_items FK_96f01ddfa744de86c46d8390759; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_damage_items
    ADD CONSTRAINT "FK_96f01ddfa744de86c46d8390759" FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_durations FK_978bcefac34a1a33617e0dca7f6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_durations
    ADD CONSTRAINT "FK_978bcefac34a1a33617e0dca7f6" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: notifications FK_9a8a82462cab47c73d25f49261f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_incident_strikes FK_9f019da92fe80de43914e9e18d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_incident_strikes
    ADD CONSTRAINT "FK_9f019da92fe80de43914e9e18d2" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_evidences FK_9f09e953491c748f7455d26b614; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT "FK_9f09e953491c748f7455d26b614" FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_tickets FK_a1f62770508fc8eff38c11c81ea; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "FK_a1f62770508fc8eff38c11c81ea" FOREIGN KEY (assigned_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: support_tickets FK_a8c6ccffa5d66547c61ef7e2924; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "FK_a8c6ccffa5d66547c61ef7e2924" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_sub_services FK_b6326153622d636b4510df768ae; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_sub_services
    ADD CONSTRAINT "FK_b6326153622d636b4510df768ae" FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE CASCADE;


--
-- Name: incidents FK_ba5ec4d7426655c4c6cacd6a2c9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "FK_ba5ec4d7426655c4c6cacd6a2c9" FOREIGN KEY (approved_by_checker_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: booking_status_logs FK_bbb0d5d5b5cd46de8b0bc971cc4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_logs
    ADD CONSTRAINT "FK_bbb0d5d5b5cd46de8b0bc971cc4" FOREIGN KEY (cancelled_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: support_tickets FK_be6405cc25bdd470590fc37ec2e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "FK_be6405cc25bdd470590fc37ec2e" FOREIGN KEY (counterparty_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_evidences FK_be9ffc7456861755ca521803469; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT "FK_be9ffc7456861755ca521803469" FOREIGN KEY (damage_item_id) REFERENCES public.incident_damage_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: blog_bookmarks FK_blog_bookmarks_blog; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_bookmarks
    ADD CONSTRAINT "FK_blog_bookmarks_blog" FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blog_bookmarks FK_blog_bookmarks_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_bookmarks
    ADD CONSTRAINT "FK_blog_bookmarks_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: blog_comments FK_blog_comments_blog; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT "FK_blog_comments_blog" FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blog_comments FK_blog_comments_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT "FK_blog_comments_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blog_tag_relations FK_blog_tag_relations_blog; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tag_relations
    ADD CONSTRAINT "FK_blog_tag_relations_blog" FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blog_tag_relations FK_blog_tag_relations_tag; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tag_relations
    ADD CONSTRAINT "FK_blog_tag_relations_tag" FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id) ON DELETE CASCADE;


--
-- Name: blogs FK_blogs_author; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT "FK_blogs_author" FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blogs FK_blogs_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT "FK_blogs_category" FOREIGN KEY (category_id) REFERENCES public.blog_categories(id) ON DELETE SET NULL;


--
-- Name: package_sub_services FK_c0514b33998fcc04d27eac0dae7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_sub_services
    ADD CONSTRAINT "FK_c0514b33998fcc04d27eac0dae7" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: incident_status_logs FK_c05dc187c382b7b3b2665a45d7c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_status_logs
    ADD CONSTRAINT "FK_c05dc187c382b7b3b2665a45d7c" FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: wallet_transactions FK_c57d19129968160f4db28fc8b28; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_messages FK_c5a611c7a231d6e899422720607; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "FK_c5a611c7a231d6e899422720607" FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasker_withdrawal_requests FK_c92c31706d11eb49f9b1d2e69c2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_withdrawal_requests
    ADD CONSTRAINT "FK_c92c31706d11eb49f9b1d2e69c2" FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: package_coverage_areas FK_cc7b6205936d8c13d2ddafe0148; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_coverage_areas
    ADD CONSTRAINT "FK_cc7b6205936d8c13d2ddafe0148" FOREIGN KEY (area_id) REFERENCES public.coverage_areas(id);


--
-- Name: payments FK_d0b02233df1c52323107fe7b4d7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_d0b02233df1c52323107fe7b4d7" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tokens FK_d417e5d35f2434afc4bd48cb4d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT "FK_d417e5d35f2434afc4bd48cb4d2" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallets FK_dcd55e9573c58b2ff8b74162ee1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_dcd55e9573c58b2ff8b74162ee1" FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: package_coverage_areas FK_e1a6a844aa22491dc799fc85d4c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_coverage_areas
    ADD CONSTRAINT "FK_e1a6a844aa22491dc799fc85d4c" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_attachments FK_e3aca48b83066a74970d8391d5c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT "FK_e3aca48b83066a74970d8391d5c" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments FK_e86edf76dc2424f123b9023a2b2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_thread_reads FK_ebcd0146eb782c460a62b87fd38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_thread_reads
    ADD CONSTRAINT "FK_ebcd0146eb782c460a62b87fd38" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_status_logs FK_f0ad6a4b582b013bcfd321121e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_status_logs
    ADD CONSTRAINT "FK_f0ad6a4b582b013bcfd321121e7" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pricing_tiers FK_pricing_tiers_package; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_tiers
    ADD CONSTRAINT "FK_pricing_tiers_package" FOREIGN KEY (package_id) REFERENCES public.service_packages(id) ON DELETE CASCADE;


--
-- Name: workflow_steps FK_steps_workflow; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT "FK_steps_workflow" FOREIGN KEY (workflow_id) REFERENCES public.service_workflows(id) ON DELETE CASCADE;


--
-- Name: tasker_deposit_transactions FK_tasker_deposit_transactions_booking; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_deposit_transactions
    ADD CONSTRAINT "FK_tasker_deposit_transactions_booking" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasker_deposit_transactions FK_tasker_deposit_transactions_tasker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_deposit_transactions
    ADD CONSTRAINT "FK_tasker_deposit_transactions_tasker" FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_workflows FK_workflows_sub_service; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_workflows
    ADD CONSTRAINT "FK_workflows_sub_service" FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE CASCADE;


--
-- Name: incident_decision_responses fk_idr_incident; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_decision_responses
    ADD CONSTRAINT fk_idr_incident FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_decision_responses fk_idr_reviewed_by_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_decision_responses
    ADD CONSTRAINT fk_idr_reviewed_by_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_decision_responses fk_idr_tasker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_decision_responses
    ADD CONSTRAINT fk_idr_tasker FOREIGN KEY (tasker_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_evidences fk_ie_decision_response; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT fk_ie_decision_response FOREIGN KEY (decision_response_id) REFERENCES public.incident_decision_responses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_evidences fk_ie_replaced_by_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT fk_ie_replaced_by_evidence FOREIGN KEY (replaced_by_evidence_id) REFERENCES public.incident_evidences(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_evidences fk_ie_soft_deleted_by_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_evidences
    ADD CONSTRAINT fk_ie_soft_deleted_by_user FOREIGN KEY (soft_deleted_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents fk_incidents_decided_by_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT fk_incidents_decided_by_admin FOREIGN KEY (decided_by_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents fk_incidents_finalized_by_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT fk_incidents_finalized_by_admin FOREIGN KEY (finalized_by_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents fk_incidents_responsibility_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT fk_incidents_responsibility_admin FOREIGN KEY (responsibility_decided_by_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents fk_incidents_second_approved_by_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT fk_incidents_second_approved_by_admin FOREIGN KEY (second_approved_by_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notification_outbox fk_notification_outbox_recipient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT fk_notification_outbox_recipient FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasker_penalties fk_tasker_penalties_tasker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasker_penalties
    ADD CONSTRAINT fk_tasker_penalties_tasker FOREIGN KEY (tasker_id) REFERENCES public.taskers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`,
    );
  }
}
