export type THeroService = {
    id: number | string;
    title: string;
    highlight: string;
    description: string;
    image: string;
    status: string;
    statusColor: string;
    bookingUrl: string;
    stats: { label: string; value: string }[];
    tag: string;
};