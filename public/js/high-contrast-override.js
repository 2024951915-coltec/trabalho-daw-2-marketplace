document.addEventListener('DOMContentLoaded', ()=>{
    const toggle = document.getElementById('high-contrast');
    const htmlEl = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'high-contrast')
    {
        htmlEl.setAttribute('data-bs-theme', 'high-contrast');
    }

    toggle.addEventListener('click', ()=>{
        const currentTheme = htmlEl.getAttribute('data-bs-theme');

        if(currentTheme === 'high-contrast')
        {
            htmlEl.removeAttribute('data-bs-theme');
            localStorage.removeItem('theme');
        }
        else
        {
            htmlEl.setAttribute('data-bs-theme', 'high-contrast');
            localStorage.setItem('theme', 'high-contrast');
        }
    })
});