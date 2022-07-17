(function () {
    let canvas = $("canvas");
    // console.log("canvas", canvas);

    //canvas context
    let ctx = canvas[0].getContext("2d");
    // console.log("context:\t", ctx);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    //get the canvas value on page load
    const dataURLStart = canvas[0].toDataURL();
    console.log("canvas value at start", dataURLStart);

    //get the position of the canvas relative to the webpage
    // let canvasOffset = canvas.offset();
    // let offsetX = canvasOffset.left;
    // let offsetY = canvasOffset.top;

    //get canvas position
    let canvasPos = canvas[0].getBoundingClientRect();
    let canvasPosX = canvasPos.left;
    let canvasPosY = canvasPos.top;

    //get the mouse position -- as object
    let mouse = {
        x: 0,
        y: 0,
    };
    //keeping track of last mouse position
    let lastMouse = mouse;

    //variable to track the drawing of the signature
    let signing;

    canvas.on("mousedown", (e) => {
        // console.log("mousedown canvas");
        signing = true;
        lastMouse = getMousePos(e);
    });
    canvas.on("mouseup", () => {
        // console.log("mouseup on canvas");
        signing = false;
    });
    canvas.on("mousemove", (e) => {
        // console.log("mousemove on canvas");
        //call the sign function here
        sign();
        mouse = getMousePos(e);
    });

    //function to get the mouse's position
    function getMousePos(event) {
        return {
            x: parseInt(event.clientX - canvasPosX),
            y: parseInt(event.clientY - canvasPosY),
        };
    }

    //function to draw the signature
    function sign() {
        if (signing) {
            ctx.moveTo(lastMouse.x, lastMouse.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            lastMouse = mouse;
        }
    }

    //submit button
    let form = $("#form");
    // console.log("submit button", submit);

    form.on("submit", (e) => {
        //get the value of the canvas on submit
        const dataURL = canvas[0].toDataURL();
        console.log("signature value", dataURL);
        //assign the value of the signature to the value of the hidden input field
        $("#signature").val(dataURL);
    });
})();
