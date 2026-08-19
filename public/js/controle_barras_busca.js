const min_price_slider = document.getElementById('preco_min');
const max_price_slider = document.getElementById('preco_max');
const min_price_display = document.getElementById('min-price-text');
const max_price_display = document.getElementById('max-price-text');
setSliderDisplays();

document.addEventListener("input", (event)=>{
    setSliderDisplays();
});

function setSliderDisplays()
{
    min_val = parseFloat( min_price_slider.value );
    max_val = parseFloat( max_price_slider.value );
    if(min_val >= max_val)
    {
        min_price_display.innerText = 'qualquer';
        max_price_display.innerText = 'qualquer';
    }
    else
    {
        min_price_display.innerText = (min_val > 0) 
            ? 'R$' + min_price_slider.value + '.00'
            : 'qualquer';

        max_price_display.innerText = (max_val < 101)
            ? 'R$' +  max_price_slider.value + '.00'
            : 'qualquer';
    }
}