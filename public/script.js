//function for the canvas signature
(function () {
    //responsive canvas size
    let canvas = $("canvas");
    canvas[0].height = window.innerWidth * 0.1;
    canvas[0].width = window.innerWidth * 0.25;

    //canvas context
    let ctx = canvas[0].getContext("2d");
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    let dataURL = null;

    //get the position of the canvas relative to the webpage
    let canvasOffset = canvas.offset();
    let offsetX = canvasOffset.left;
    let offsetY = canvasOffset.top;

    //redefine canvas on window resize
    $(window).resize(function () {
        canvas[0].height = window.innerWidth * 0.1;
        canvas[0].width = window.innerWidth * 0.25;
        //update canvas coordinates
        canvasOffset = canvas.offset();
        offsetX = canvasOffset.left;
        offsetY = canvasOffset.top;
        dataURL = null;
    });

    //get the coordinates of the mouse position
    let mouse = {
        x: 0,
        y: 0,
    };

    //keeping track of last mouse position
    let lastMouse = mouse;
    //variable to track the drawing of the signature
    let signing;

    canvas.on("mousedown", (e) => {
        signing = true;
        lastMouse = getMousePos(e);
    });

    $(document).on("mouseup", (e) => {
        if (e.target !== canvas) {
            signing = false;
        }
    });

    canvas.on("mousemove", (e) => {
        //call the sign function here
        sign();
        mouse = getMousePos(e);
    });

    //function to get the mouse's position
    function getMousePos(event) {
        return {
            x: parseInt(event.clientX - offsetX),
            y: parseInt(event.clientY - offsetY),
        };
    }

    //function to draw the signature
    function sign() {
        if (signing) {
            ctx.moveTo(lastMouse.x, lastMouse.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            lastMouse = mouse;
            //get the value of the canvas here
            dataURL = canvas[0].toDataURL();
        }
    }

    // clear signature button
    let clear = $("#clear-signature");
    clear.on("click", (e) => {
        dataURL = null;
        //prevent the click of the button from submitting the form
        e.preventDefault();
        canvas[0].width = canvas[0].width;
    });

    //submit form
    let form = $("#form");
    form.on("submit", () => {
        //assign the value of the signature to the value of the hidden input field
        $("#signature").val(dataURL);
    });
})();
