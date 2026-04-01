// ===== HERO SLIDER =====
let currentSlide = 0;
const totalSlides = 3;

function goSlide(n) {
    document.getElementById('slide-' + currentSlide).classList.remove('active');
    document.querySelectorAll('.hero-dots span')[currentSlide].classList.remove('active');
    currentSlide = n;
    document.getElementById('slide-' + currentSlide).classList.add('active');
    document.querySelectorAll('.hero-dots span')[currentSlide].classList.add('active');
}

setInterval(() => {
    goSlide((currentSlide + 1) % totalSlides);
}, 5000);

// ===== NAV =====
function toggleNav() {
    const nav = document.getElementById('navLinks');
    nav.classList.toggle('open');
}
document.addEventListener('click', (e) => {
    const nav = document.getElementById('navLinks');
    const ham = document.getElementById('hamburger');
    if (!nav.contains(e.target) && !ham.contains(e.target)) {
        nav.classList.remove('open');
    }
});

// Mobile dropdown
document.querySelectorAll('.dropdown > a').forEach(a => {
    a.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
            e.preventDefault();
            a.parentElement.classList.toggle('open');
        }
    });
});

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    observer.observe(el);
});

// ===== COUNTER ANIMATION =====
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) {
            e.target.dataset.done = true;
            const target = parseInt(e.target.dataset.target);
            let count = 0;
            const step = Math.ceil(target / 60);
            const timer = setInterval(() => {
                count = Math.min(count + step, target);
                e.target.textContent = count.toLocaleString() + (e.target.closest('.stat-item').querySelector('.stat-label').textContent.includes('%') ? '+' : '+');
                if (count >= target) {
                    e.target.textContent = target.toLocaleString() + '+';
                    clearInterval(timer);
                }
            }, 30);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    counterObserver.observe(el);
});

// ===== BACK TO TOP =====
window.addEventListener('scroll', () => {
    const bt = document.getElementById('backTop');
    if (window.scrollY > 400) bt.classList.add('visible');
    else bt.classList.remove('visible');
});

// ===== TABS =====
function switchTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    // Re-trigger animations
    document.querySelectorAll('#' + id + ' .reveal').forEach(el => {
        el.classList.remove('visible');
        setTimeout(() => el.classList.add('visible'), 50);
    });
}

// ===== IMAGE UPLOAD =====
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            const placeholder = input.closest('label');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function galleryPreview(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('gallery-img-' + index);
            const label = input.closest('.gallery-item').querySelector('.gallery-placeholder');
            img.src = e.target.result;
            img.style.display = 'block';
            if (label) label.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function uploadTopperPhoto(container) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            container.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        };
        reader.readAsDataURL(e.target.files[0]);
    };
    input.click();
}

// ===== MODALS =====
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
function openAddTopperModal() {
    document.getElementById('topperModal').classList.add('open');
}
function openAddFacultyModal() {
    document.getElementById('facultyModal').classList.add('open');
}

// ===== FORM SUBMIT =====

// Rate limiting: track last submit time per form
const _lastSubmit = {};

function startCooldown(btn, originalText, formKey, seconds) {
    _lastSubmit[formKey] = Date.now();
    let remaining = seconds;
    btn.disabled = true;
    btn.innerHTML = `Please wait ${remaining}s...`;
    const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(timer);
            btn.innerHTML = originalText;
            btn.disabled = false;
        } else {
            btn.innerHTML = `Please wait ${remaining}s...`;
        }
    }, 1000);
}

function submitEnquiry() {
    // Collect the data from the form
    const templateParams = {
        student_name: document.getElementById('adm-name').value.trim(),
        class_applied: document.getElementById('adm-class').value,
        parent_name: document.getElementById('adm-parent').value.trim(),
        mobile: document.getElementById('adm-phone').value.trim(),
        branch: document.getElementById('adm-branch').value,
        message: document.getElementById('adm-message').value.trim()
    };

    // Validation: required fields
    if (!templateParams.student_name || !templateParams.mobile || !templateParams.class_applied) {
        alert('Please fill in all required fields (*)');
        return;
    }
    // Validation: phone must be 10 digits
    if (!/^[0-9]{10}$/.test(templateParams.mobile)) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
    }

    // Rate limiting: 60s cooldown between submits
    if (_lastSubmit['enquiry'] && Date.now() - _lastSubmit['enquiry'] < 60000) {
        alert('Please wait a moment before submitting again.');
        return;
    }

    const submitBtn = document.querySelector('.form-submit');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Sending...';
    submitBtn.disabled = true;

    emailjs.send('service_k89z5zo', 'template_funqrfi', templateParams)
        .then(function (response) {
            document.getElementById('modalMessage').textContent = 'Your admission enquiry has been submitted! Our counsellor will contact you within 24 hours. Thank you for choosing Sri Sai Inter College.';
            document.getElementById('successModal').classList.add('open');

            document.getElementById('adm-name').value = '';
            document.getElementById('adm-class').value = '';
            document.getElementById('adm-parent').value = '';
            document.getElementById('adm-phone').value = '';
            document.getElementById('adm-branch').value = '';
            document.getElementById('adm-message').value = '';

            startCooldown(submitBtn, originalBtnText, 'enquiry', 60);
        }, function (error) {
            alert("Sorry, we couldn't send your enquiry. Please try again or call us directly.");
            console.error('EmailJS Error:', error);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
}



// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
});


// Submit Contact us Form

function submitContact() {
    const contactBtn = document.querySelector('.submit-btn');
    const originalBtnText = contactBtn.innerHTML;

    const contactParams = {
        from_name: document.getElementById('cf-name').value.trim(),
        mobile: document.getElementById('cf-phone').value.trim(),
        user_email: document.getElementById('cf-email').value.trim(),
        subject: document.getElementById('cf-subject').value.trim(),
        message: document.getElementById('cf-message').value.trim()
    };

    // Validation: required fields
    if (!contactParams.from_name || !contactParams.mobile || !contactParams.message) {
        alert('Please fill in all required fields (Name, Mobile, and Message).');
        return;
    }
    // Validation: phone must be 10 digits
    if (!/^[0-9]{10}$/.test(contactParams.mobile)) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
    }
    // Validation: email format (if provided)
    if (contactParams.user_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactParams.user_email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Rate limiting: 60s cooldown between submits
    if (_lastSubmit['contact'] && Date.now() - _lastSubmit['contact'] < 60000) {
        alert('Please wait a moment before submitting again.');
        return;
    }

    contactBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    contactBtn.disabled = true;

    emailjs.send('service_k89z5zo', 'template_1v2lszb', contactParams)
        .then(function (response) {
            document.getElementById('modalMessage').textContent = 'Thank you ' + contactParams.from_name + '! Your message regarding "' + contactParams.subject + '" has been sent successfully.';
            document.getElementById('successModal').classList.add('open');

            document.getElementById('cf-name').value = '';
            document.getElementById('cf-phone').value = '';
            document.getElementById('cf-email').value = '';
            document.getElementById('cf-message').value = '';

            startCooldown(contactBtn, originalBtnText, 'contact', 60);
        }, function (error) {
            alert('Failed to send message. Please check your internet connection and try again.');
            contactBtn.innerHTML = originalBtnText;
            contactBtn.disabled = false;
            console.error('EmailJS error:', error);
        });
}