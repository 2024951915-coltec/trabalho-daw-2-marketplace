document.addEventListener("DOMContentLoaded", ()=>{
    const btn = document.getElementById('font-size-toggle');
    const htmlEl = document.documentElement;

    const saved_font_size = localStorage.getItem("font-size");
    if(saved_font_size == 'large')
    {
        htmlEl.setAttribute('gg-font-size', 'large');
        btn.innerHTML="Tam. da Fonte:<br>Grande"
    }
    else
    {
        btn.innerHTML="Tam. da Fonte:<br>Pequena"
    }

    btn.addEventListener('click', ()=>{
        const gg_font_size = htmlEl.getAttribute('gg-font-size');

        if(gg_font_size == "large")
        {
            htmlEl.removeAttribute('gg-font-size');
            localStorage.removeItem('font-size');
            btn.innerHTML="Tam. da Fonte:<br>Pequena"
        }
        else
        {
            htmlEl.setAttribute('gg-font-size', 'large');
            localStorage.setItem('font-size', 'large');
            btn.innerHTML="Tam. da Fonte:<br>Grande"
        }
    })
});