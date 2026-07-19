DO $$ 
DECLARE 
    dist_id UUID;
    
    sub_nagercoil UUID;
    sub_kanyakumari UUID;
    sub_marthandam UUID;
    sub_colachel UUID;
    sub_thuckalay UUID;
    
    junc_id UUID;
BEGIN
    -- 1. District
    SELECT id INTO dist_id FROM districts WHERE district_name = 'Kanyakumari';
    IF dist_id IS NULL THEN
        dist_id := gen_random_uuid();
        INSERT INTO districts (id, district_name, state, country) VALUES (dist_id, 'Kanyakumari', 'Tamil Nadu', 'India');
    END IF;

    -- 2. Subdivisions
    -- Nagercoil
    SELECT id INTO sub_nagercoil FROM subdivisions WHERE subdivision_name = 'Nagercoil';
    IF sub_nagercoil IS NULL THEN
        sub_nagercoil := gen_random_uuid();
        INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code) VALUES (sub_nagercoil, dist_id, 'Nagercoil', 'NGL');
    END IF;

    -- Kanyakumari
    SELECT id INTO sub_kanyakumari FROM subdivisions WHERE subdivision_name = 'Kanyakumari';
    IF sub_kanyakumari IS NULL THEN
        sub_kanyakumari := gen_random_uuid();
        INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code) VALUES (sub_kanyakumari, dist_id, 'Kanyakumari', 'KK');
    END IF;

    -- Marthandam
    SELECT id INTO sub_marthandam FROM subdivisions WHERE subdivision_name = 'Marthandam';
    IF sub_marthandam IS NULL THEN
        sub_marthandam := gen_random_uuid();
        INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code) VALUES (sub_marthandam, dist_id, 'Marthandam', 'MAR');
    END IF;

    -- Colachel
    SELECT id INTO sub_colachel FROM subdivisions WHERE subdivision_name = 'Colachel';
    IF sub_colachel IS NULL THEN
        sub_colachel := gen_random_uuid();
        INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code) VALUES (sub_colachel, dist_id, 'Colachel', 'COL');
    END IF;

    -- Thuckalay
    SELECT id INTO sub_thuckalay FROM subdivisions WHERE subdivision_name = 'Thuckalay';
    IF sub_thuckalay IS NULL THEN
        sub_thuckalay := gen_random_uuid();
        INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code) VALUES (sub_thuckalay, dist_id, 'Thuckalay', 'THU');
    END IF;


    -- 3. Junctions & Cameras
    -- Function to insert a junction and camera
    -- Since we can't define functions inside DO block easily without CREATE OR REPLACE, we'll just copy paste the block.

    -- KAI1: Collectorate Roundana (Nagercoil)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_nagercoil, 'Collectorate Roundana', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Collectorate Roundana', 'KAI1', 'ONLINE', '192.168.1.101');

    -- KAI2: Chettikulam (Nagercoil)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_nagercoil, 'Chettikulam', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Chettikulam', 'KAI2', 'ONLINE', '192.168.1.102');

    -- KAI3: Parvathipuram (Nagercoil)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_nagercoil, 'Parvathipuram', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Parvathipuram', 'KAI3', 'ONLINE', '192.168.1.103');

    -- KAI4: Vadasery (Nagercoil)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_nagercoil, 'Vadasery', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Vadasery', 'KAI4', 'ONLINE', '192.168.1.104');

    -- KAI5: Apta Market (Nagercoil)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_nagercoil, 'Apta Market', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Apta Market', 'KAI5', 'ONLINE', '192.168.1.105');


    -- KAI6: Anjugramam (Kanyakumari)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_kanyakumari, 'Anjugramam', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Anjugramam', 'KAI6', 'ONLINE', '192.168.1.106');

    -- KAI7: Kanyakumari (Kanyakumari)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_kanyakumari, 'Kanyakumari', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Kanyakumari', 'KAI7', 'ONLINE', '192.168.1.107');


    -- KAI8: Thiruthuvapuram (Marthandam)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_marthandam, 'Thiruthuvapuram', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Thiruthuvapuram', 'KAI8', 'ONLINE', '192.168.1.108');


    -- KAI9: Karungal (Colachel)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_colachel, 'Karungal', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Karungal', 'KAI9', 'ONLINE', '192.168.1.109');


    -- KAI10: Thuckalay (Thuckalay)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_thuckalay, 'Thuckalay', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Thuckalay', 'KAI10', 'ONLINE', '192.168.1.110');

    -- KAI11: Azhagiyamandapam (Thuckalay)
    junc_id := gen_random_uuid();
    INSERT INTO junctions (id, subdivision_id, junction_name, junction_type) VALUES (junc_id, sub_thuckalay, 'Azhagiyamandapam', 'ROUNDANA');
    INSERT INTO cameras (id, junction_id, camera_name, camera_code, status, device_ip) VALUES (gen_random_uuid(), junc_id, 'RDK X5 - Azhagiyamandapam', 'KAI11', 'ONLINE', '192.168.1.111');

END $$;
