
-- Link existing service_queue items to their complaints
UPDATE public.service_queue 
SET complaint_id = '0e2080ef-841e-468b-b23f-c3be7f1b4107'
WHERE id = '1f29a9b7-54dd-45f0-a2bc-9631956dd167' AND complaint_id IS NULL;

UPDATE public.service_queue 
SET complaint_id = '7ca08094-8705-45bb-bfd7-c4f9ba311041'
WHERE id = 'b92e9348-1ab7-4cfb-9334-3962e990c72e' AND complaint_id IS NULL;
