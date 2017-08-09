package main

import (
	"log"
	"net/http"
	"net"
	"fmt"

	"github.com/badgerloop-software/dashboard/database"
	//api "github.com/badgerloop-software/dashboard/services"
	models "github.com/badgerloop-software/dashboard/models"
	//restful "github.com/emicklei/go-restful"
)

func CheckError(err error) {
	if err != nil {
		log.Fatalln(err)
	}
}

/*****************************************************************************/
/*                     Microcontroller-related Networking                    */
/*****************************************************************************/
var ourAddr, outAddr *net.UDPAddr
var conn *net.UDPConn

func initialize_UDP() {
	var err error
	ourAddr, err = net.ResolveUDPAddr("udp", ":3000")
	CheckError(err)
	outAddr, err = net.ResolveUDPAddr("udp", "192.168.0.10:3000")
	CheckError(err)
	conn, err = net.ListenUDP("udp", ourAddr)
	CheckError(err)
}

func UDPServer() {

	var err error
	var n int
	dat := models.Data{}
	buf := make([]byte, 1024)

	fmt.Println("Starting UDP Server")

	for {
		n, ourAddr, err = conn.ReadFromUDP(buf[:])
		/* SpaceX Packet */
		if n == 34 {
			dat, err = models.ParseSpaceXPacket(buf[:34])
			if err == nil {
				models.PrintSpaceX(dat)
			}
		/* Dashboard Packet */
		} else if n == 47 {
			dat, err = models.ParseDashboardPacket(buf[:47])
			if err == nil {
				models.PrintDashboard(dat)
				// TODO: push to DB
			}
		/* Malformed Packet*/
		} else {
			fmt.Println("(Malformed packet, ", n, " bytes) ", buf[0:n], " from ", ourAddr)
		}
		CheckError(err)

		n, err = conn.WriteToUDP([]byte("I got your packet (:"), outAddr)
		CheckError(err)
	}
}
/*****************************************************************************/
/*****************************************************************************/


/*****************************************************************************/
/*                                HTTP Handlers                              */
/*****************************************************************************/
func handler(w http.ResponseWriter, r *http.Request) {
	var err error
	testData := []models.Data{}
	err = database.GetConnection().Select(&testData, "SELECT * FROM Data LIMIT 1")
	CheckError(err)
	fmt.Fprintf(w, "(%s) %#v", r.URL.Path[1:], testData)
}

func UDPForwardingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Request: ", r.URL)
}
/*****************************************************************************/
/*****************************************************************************/

func db_test() {
	var err error
	testData := []models.Data{}
	err = database.GetConnection().Select(&testData, "SELECT * FROM Data")
	CheckError(err)
	fmt.Printf("query returned %d results.\n", len(testData))
}

func main() {

	/* Setup database connection */
	database.InitDB("dashboard:betsy@tcp(badgerloop.com:3306)/Dashboard")
	db_test()

	initialize_UDP()
	defer conn.Close()

	/* Listen for microcontroller */
	go UDPServer()

	/* Serve on port 2000 */
	http.HandleFunc("/", handler)
	http.HandleFunc("/message", UDPForwardingHandler)
	log.Fatal(http.ListenAndServe(":2000", nil))
}

