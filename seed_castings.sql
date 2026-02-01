-- Seed 10 Realistic Casting Calls

INSERT INTO castings (title, brand_name, brand_logo_url, location, rate, date_range, gender_req, height_min, height_max, apply_method, apply_contact) VALUES
-- 1. High Fashion
('Vogue Italia Editorial', 'Vogue Italia', 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Vogue-logo.jpg', 'Milan', 'Trade / Tear Sheet', 'Sep 10 - Sep 11', 'female', 176, 182, 'email', 'bookings@vogue.it'),

-- 2. Commercial
('Coca-Cola Summer Campaign', 'Coca-Cola', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg', 'London', '£3,000 / day', 'Aug 15 - Aug 16', 'all', 160, 185, 'email', 'casting@coke-agencies.com'),

-- 3. UGC / Social
('Skincare TikTok Creator', 'Glow Recipe', 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Glow_Recipe_logo.png', 'Remote', '£500 Flat', 'Flexible', 'female', 0, 0, 'link', 'https://glowrecipe.com/creators/apply'),

-- 4. Runway
('LFW Opening Show', 'Burberry', 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Burberry_Logo.svg', 'London', '£1,200', 'Sep 18', 'female', 178, 182, 'email', 'casting@burberry.com'),

-- 5. Fitness
('Gymshark Activewear Shoot', 'Gymshark', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Gymshark_logo.svg', 'Manchester', '£800 / day', 'Oct 01 - Oct 03', 'all', 165, 190, 'email', 'models@gymshark.com'),

-- 6. Hair Model
('L''Oreal Colour Trophy', 'L''Oreal Paris', 'https://upload.wikimedia.org/wikipedia/commons/9/9d/L%27Or%C3%A9al_logo.svg', 'Paris', '£2,000 + Travel', 'Oct 15', 'female', 170, 180, 'email', 'casting@loreal.com'),

-- 7. E-Commerce
('ASOS Mainboard', 'ASOS', 'https://upload.wikimedia.org/wikipedia/commons/3/33/Asos_logo.svg', 'London', '£400 / day (Recurring)', 'Ongoing', 'all', 172, 185, 'link', 'https://asos-careers.com/modeling'),

-- 8. Music Video
('Sony Music Music Video', 'Sony Music', 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Sony_Music_Entertainment_logo.svg', 'London', '£350 / day', 'Sep 25', 'all', 0, 0, 'email', 'casting@sonymusic.com'),

-- 9. High Fashion Men
('GQ Style Feature', 'GQ Magazine', 'https://upload.wikimedia.org/wikipedia/commons/b/b3/GQ_magazine_logo.svg', 'London', '£150', 'Sep 05', 'male', 183, 190, 'email', 'style@gq.co.uk'),

-- 10. Beauty Campaign
('Fenty Beauty Global', 'Fenty Beauty', 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Fenty_Beauty_logo.svg', 'Los Angeles', '$5,000 USD', 'Nov 01 - Nov 05', 'female', 0, 0, 'link', 'https://fentybeauty.com/pages/casting');
